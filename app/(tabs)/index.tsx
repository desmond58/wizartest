import { Image, StyleSheet, Platform, TouchableOpacity } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getDeviceList, openConnection, closeConnection, sendCommand, RequestType, cancelCommand } from '../../modules/expo-wizarpos-q2-payment';
import { generateTransactionId, getLastTransactionId } from '../../utils/transactionManager';

export default function HomeScreen() {
  // Function to generate a random sequence number
  const generateSequenceNumber = () => {
    return Math.floor(Math.random() * 0xFFFF); // Generates a random number between 0x0000 and 0xFFFF
  };

  const handleHandShake = async () => {
    try {
      // Get list of available devices
      const devices = await getDeviceList();
      // console.log('Available USB devices:', devices);

      if (devices.length > 0) {
        // Try to connect to the first device
        const device = devices[0];
        // console.log('Attempting to connect to device:', device.deviceName);

        const result = await openConnection(device.deviceId);
        if (result.success) {
          // console.log('Successfully connected to device:', result.message);

          // Example: Send a handshake request with some test data
          const commandResult = await sendCommand({
            requestType: RequestType.HANDSHAKE_REQUEST,
            content: "1234",
            sequenceNumber: generateSequenceNumber(), // Optional: specific sequence number
            timeout: 20000 // 20 seconds timeout
          });

          if (commandResult.success) {
            console.log('Command result:', {
              // sent: commandResult.command,
              parsedContent: commandResult.parsedData
            });
          } else if (commandResult.timeout) {
            console.log('Command timed out:', commandResult.message);
          } else {
            console.log('Command failed:', commandResult.message);
          }

          // Close the connection when done
          const closeResult = await closeConnection();
          console.log('Connection closed:', closeResult.message);
        } else {
          console.log('Failed to connect:', result.message);
        }
      } else {
        console.log('No USB devices found');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleTransactionConnection = async () => {
    try {
      const devices = await getDeviceList();

      if (devices.length > 0) {
        const device = devices[0];
        const result = await openConnection(device.deviceId);

        if (result.success) {
          const transId = await generateTransactionId();

          const transactionData = {
            TransType: "Purchase",
            TransIndexCode: transId,
            TransAmount: "10000",
            CurrencyCode: "458",
            ReqTransDate: "20250124",
            ReqTransTime: "164600",
            EnableReceipt: true,
            AppendingReceiptInfo: "",
            EnableCancelInPayment: true,
            SkipConfirmProcedure: false
          };
          console.log('Transaction data:', transactionData);
          // Send POS transaction command
          const commandResult = await sendCommand({
            requestType: RequestType.FROM_CASHIER,
            content: JSON.stringify(transactionData),
            sequenceNumber: generateSequenceNumber(), // Optional: specific sequence number
            timeout: 20000 // 20 seconds timeout
          });

          if (commandResult.success) {
            let parsedContent = commandResult.parsedData;
            try {
              const jsonStartIndex = parsedContent.indexOf('{');
              if (jsonStartIndex !== -1) {
                parsedContent = parsedContent.substring(jsonStartIndex);
              }
              parsedContent = JSON.parse(parsedContent);
            } catch (e) {
              console.error('Failed to parse response content:', e);
            }
            console.log('Command result in trans:', {
              // sent: commandResult.command,
              parsedContent: parsedContent
            });
          } else if (commandResult.timeout) {
            console.log('Command timed out in trans:', commandResult.message);
          } else {
            console.log('Command failed in trans:', commandResult.message);
          }

          // Delay for 3 seconds before closing the connection
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Close the connection when done
          const closeResult = await closeConnection();
          console.log('Connection closed in trans:', closeResult.message);
        } else {
          console.log('Failed to connect in trans:', result.message);
        }
      } else {
        console.log('No USB devices found');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRefundConnection = async () => {
    try {
      const devices = await getDeviceList();

      if (devices.length > 0) {
        const device = devices[0];
        const result = await openConnection(device.deviceId);

        if (result.success) {
          const lastTransId = await getLastTransactionId();

          if (!lastTransId) {
            console.log('No previous transaction found');
            return;
          }

          const refundData = {
            TransType: "Reversal",
            OriTransId: lastTransId,
            EnableReceipt: false,
            SkipConfirmProcedure: false
          };
          console.log('Refund data:', refundData);
          // Send POS transaction command
          const commandResult = await sendCommand({
            requestType: RequestType.FROM_CASHIER,
            content: JSON.stringify(refundData),
            sequenceNumber: generateSequenceNumber(), // Optional: specific sequence number
            timeout: 20000 // 20 seconds timeout
          });

          if (commandResult.success) {
            let parsedContent = commandResult.parsedData;
            try {
              const jsonStartIndex = parsedContent.indexOf('{');
              if (jsonStartIndex !== -1) {
                parsedContent = parsedContent.substring(jsonStartIndex);
              }
              parsedContent = JSON.parse(parsedContent);
            } catch (e) {
              console.error('Failed to parse response content:', e);
            }
            console.log('Command result in Cancel:', {
              // sent: commandResult.command,
              parsedContent: parsedContent
            });
          } else if (commandResult.timeout) {
            console.log('Command timed out:', commandResult.message);
          } else {
            console.log('Command failed:', commandResult.message);
          }

          // Close the connection when done
          const closeResult = await closeConnection();
          console.log('Connection closed:', closeResult.message);
        } else {
          console.log('Failed to connect:', result.message);
        }
      } else {
        console.log('No USB devices found');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCancelConnection = async () => {
    try {
      // const cancelResult = await cancelCommand();
      // console.log('Cancel command result:', cancelResult.message);

      // if (cancelResult.success) {
      const commandResult = await sendCommand({
        requestType: RequestType.CANCEL_REQUEST,
        content: "",
        sequenceNumber: generateSequenceNumber(),
        timeout: 1000
      });

      if (commandResult.success) {
        let parsedContent = commandResult.parsedData;
        try {
          const jsonStartIndex = parsedContent.indexOf('{');
          if (jsonStartIndex !== -1) {
            parsedContent = parsedContent.substring(jsonStartIndex);
          }
          parsedContent = JSON.parse(parsedContent);
        } catch (e) {
          console.error('Failed to parse response content:', e);
        }
        console.log('Cancel request sent successfully:', parsedContent);
      } else {
        console.log('Failed to send cancel request:', commandResult.message);
      }
      // }

      const closeResult = await closeConnection();
      console.log('Connection closed:', closeResult.message);
    } catch (error) {
      console.error('Error during cancellation:', error);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
        <TouchableOpacity style={styles.test} activeOpacity={0.8} onPress={handleHandShake}>
          <ThemedText style={{ color: 'white' }}>
            Test Handshake
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.test} activeOpacity={0.8} onPress={handleTransactionConnection}>
          <ThemedText style={{ color: 'white' }}>
            Test Serial
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.test} activeOpacity={0.8} onPress={handleRefundConnection}>
          <ThemedText style={{ color: 'white' }}>
            Test Void
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} activeOpacity={0.8} onPress={handleCancelConnection}>
          <ThemedText style={{ color: 'white' }}>
            Cancel Serial
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  test: {
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancel: {
    backgroundColor: '#D14A62',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
