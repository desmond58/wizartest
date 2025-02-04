package expo.modules.wizarposq2payment

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.hardware.usb.*
import com.hoho.android.usbserial.driver.*
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.Promise
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

class ExpoWizarposQ2PaymentModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext)
  private val usbManager by lazy { context.getSystemService(Context.USB_SERVICE) as UsbManager }
  private var serialPort: UsbSerialPort? = null
  private val ACTION_USB_PERMISSION = "expo.modules.wizarposq2payment.USB_PERMISSION"
  private val TIMEOUT = 15000 // Read timeout in milliseconds
  private var commandJob: Job? = null
  private val coroutineScope = CoroutineScope(Dispatchers.Main + Job())

  override fun definition() = ModuleDefinition {
    Name("ExpoWizarposQ2Payment")

    AsyncFunction("getDeviceList") {
      val availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
      availableDrivers.map { driver ->
        mapOf(
          "deviceName" to driver.device.deviceName,
          "deviceId" to driver.device.deviceId,
          "vendorId" to driver.device.vendorId,
          "productId" to driver.device.productId
        )
      }
    }

    AsyncFunction("openConnection") { deviceId: Int ->
      try {
        val availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
        val driver = availableDrivers.find { it.device.deviceId == deviceId }
          ?: throw Exception("Device not found")

        if (!usbManager.hasPermission(driver.device)) {
          val permissionIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(ACTION_USB_PERMISSION),
            PendingIntent.FLAG_IMMUTABLE
          )
          usbManager.requestPermission(driver.device, permissionIntent)
          throw Exception("USB permission required")
        }

        val connection = usbManager.openDevice(driver.device)
          ?: throw Exception("Failed to open connection")

        serialPort = driver.ports[0] // Most devices have just one port (port 0)
        serialPort?.open(connection)
        serialPort?.setParameters(115200, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)

        mapOf(
          "success" to true,
          "message" to "Connection opened successfully"
        )
      } catch (e: Exception) {
        mapOf(
          "success" to false,
          "message" to (e.message ?: "Unknown error")
        )
      }
    }

    AsyncFunction("closeConnection") {
      try {
        serialPort?.close()
        serialPort = null
        mapOf(
          "success" to true,
          "message" to "Connection closed successfully"
        )
      } catch (e: Exception) {
        mapOf(
          "success" to false,
          "message" to (e.message ?: "Unknown error")
        )
      }
    }

    AsyncFunction("sendCommand") { command: Map<String, Any>, promise: Promise ->
      // commandJob?.cancel() // Cancel any previous command
      commandJob = coroutineScope.launch(Dispatchers.Default) {
        try {
          val serialPort = serialPort ?: throw Exception("Serial port not open")
          val requestType = command["requestType"] as? String ?: throw Exception("Request type is required")
          val content = command["content"] as? String ?: "" // Allow empty content for cancel operations
          val timeout  = (command["timeout"] as? Double)?.toLong() ?: TIMEOUT.toLong()
          val sequenceNumber = (command["sequenceNumber"] as? Double)?.toInt() ?: 0x0462 // Default sequence

          println("Command parameters:")
          println("Request Type: 0x$requestType")

          // Convert content to bytes (assuming ASCII/UTF-8)
          val contentBytes = content.toByteArray(Charsets.US_ASCII)
                
          // Calculate content length (2 bytes, big endian)
          val contentLength = contentBytes.size
          val lenBytes = byteArrayOf(
            ((contentLength shr 8) and 0xFF).toByte(),
            (contentLength and 0xFF).toByte()
          )

          // Build control bytes
          val ctrlBytes = byteArrayOf(
            requestType.toInt(16).toByte(), // Convert hex string to byte
            0x00.toByte(), // Reserved byte
            ((sequenceNumber shr 8) and 0xFF).toByte(), // Sequence number high byte
            (sequenceNumber and 0xFF).toByte() // Sequence number low byte
          )

          // Build the complete packet
          val packet = mutableListOf<Byte>()
          packet.add(0x02) // STX
          packet.add(0x02) // VERSION
          packet.addAll(ctrlBytes.toList())
          packet.addAll(lenBytes.toList())
          packet.addAll(contentBytes.toList())
          packet.add(0x03) // ETX

          // Calculate BCC
          var bcc: Byte = 0x02 // Start with VERSION
          for (i in 2 until packet.size) { // Skip STX
            bcc = (bcc.toInt() xor packet[i].toInt()).toByte()
          }
          packet.add(bcc)

          println("\nFinal packet structure:")
          println("STX: 0x02")
          println("VERSION: 0x02")
          println("CTRL: ${ctrlBytes.joinToString(" ") { "0x${(it.toInt() and 0xFF).toString(16).padStart(2, '0')}" }}")
          println("LEN: ${lenBytes.joinToString(" ") { "0x${(it.toInt() and 0xFF).toString(16).padStart(2, '0')}" }}")
          println("CONTENT: ${contentBytes.joinToString(" ") { "0x${(it.toInt() and 0xFF).toString(16).padStart(2, '0')}" }}")
          println("ETX: 0x03")
          println("BCC: 0x${(bcc.toInt() and 0xFF).toString(16).padStart(2, '0')}")

          println("\nComplete packet as hex:")
          val hexString = packet.joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }
          println(hexString)

          // Convert to byte array and send
          val byteArray = packet.toByteArray()
          serialPort.write(byteArray, TIMEOUT)

          // Create a coroutine to read response with timeout
          val responseBuffer = mutableListOf<Int>()
          val startTime = System.currentTimeMillis()
          while (System.currentTimeMillis() - startTime < timeout) {
            if (commandJob!!.isCancelled) {
              println("Command cancelled")
              break
            }
            val buffer = ByteArray(1024)
            val bytesRead = serialPort.read(buffer, 500)
            if (bytesRead > 0) {
              responseBuffer.addAll(buffer.slice(0 until bytesRead).map { it.toInt() and 0xFF })
              if (responseBuffer.size >= 2 && responseBuffer[0] == 0x02 && responseBuffer.contains(0x03)) {
                break
              }
            }
            delay(50)
          }

          if (responseBuffer.isEmpty()) {
            println("Buffer is Emply!!!!!!!!!!!!")
            promise.resolve(mapOf(
              "success" to false,
              "message" to "Timeout: No response received",
              "timeout" to true,
              "command" to command
            ))
          } else {
            // Parse the response
            val response = responseBuffer.map { it }
            val responseContent = if (response.size > 7) {
              // Extract content between header and ETX
              val contentStart = 7 // After STX, VERSION, CTRL, LEN
              val contentEnd = response.indexOf(0x03)
              if (contentEnd > contentStart) {
                String(response.subList(contentStart, contentEnd).map { it.toByte() }.toByteArray())
              } else null
            } else null

            println("Complete packet received: ${response.joinToString(" ") { "0x${(it.toInt() and 0xFF).toString(16).padStart(2, '0')}" }}")

            promise.resolve(mapOf(
              "success" to true,
              "data" to response,
              "parsedData" to responseContent,
              "message" to "Response received successfully",
              "command" to command
            ))
          }
        } catch (e: Exception) {
          promise.resolve(mapOf(
            "success" to false,
            "message" to (e.message ?: "Unknown error"),
            "command" to command
          ))
        }
      }
    }

    AsyncFunction("cancelCommand") {
      commandJob?.cancel()
      println("Command job cancelled")
      mapOf(
        "success" to true,
        "message" to "Requesting Cancel",
      )
    }
  }
}