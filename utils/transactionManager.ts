import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_TRANSACTION_KEY = 'LAST_TRANSACTION_ID';

export const generateTransactionId = async (): Promise<string> => {
  const currentDate = new Date();
  const timestamp = currentDate.getTime();
  const randomNum = Math.floor(Math.random() * 1000);
  const transId = `${timestamp}${randomNum}`.slice(-6); // Get last 6 digits
  
  // Store the transaction ID
  await AsyncStorage.setItem(LAST_TRANSACTION_KEY, transId);
  
  return transId;
};

export const getLastTransactionId = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(LAST_TRANSACTION_KEY);
};
