const STORAGE_KEY = 'FINTRACK_TRANSACTIONS_DATA';

const Storage = {
  getTransactions() {
    const rawData = localStorage.getItem(STORAGE_KEY);
    try {
      return rawData ? JSON.parse(rawData) : [];
    } catch (error) {
      console.error('Gagal membaca data dari localStorage:', error);
      return [];
    }
  },

  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
      return true;
    } catch (error) {
      console.error('Gagal menyimpan data ke localStorage:', error);
      return false;
    }
  },

  addTransaction(transaction) {
    const transactions = this.getTransactions();
    transactions.unshift(transaction);
    this.saveTransactions(transactions);
    return transactions;
  },

  updateTransaction(updatedData) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(item => item.id === updatedData.id);

    if (index !== -1) {
      transactions[index] = updatedData;
      this.saveTransactions(transactions);
    }

    return transactions;
  },

  deleteTransaction(id) {
    const transactions = this.getTransactions();
    const updatedTransactions = transactions.filter(item => item.id !== id);
    this.saveTransactions(updatedTransactions);
    return updatedTransactions;
  }
};