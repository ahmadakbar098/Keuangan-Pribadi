const AppState = {
  currentFilter: 'all',
  editingId: null,
  transactions: []
};

const FilterHelper = {
  getFilteredTransactions(transactions, filterType) {
    if (filterType === 'all') return transactions;

    const now = new Date();
    // Mengambil tanggal lokal perangkat
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const todayISO = `${year}-${month}-${day}`;       // Contoh: 2026-10-12
    const thisMonthISO = `${year}-${month}`;          // Contoh: 2026-10

    return transactions.filter(item => {
      if (!item.date) return false;

      switch (filterType) {
        case 'daily':
          return item.date === todayISO;
        case 'monthly':
          return item.date.startsWith(thisMonthISO);
        case 'yearly':
          return item.date.startsWith(String(year));
        default:
          return true;
      }
    });
  }
};

const App = {
  init() {
    AppState.transactions = Storage.getTransactions();

    UI.setDefaultDate();
    UI.populateCategories('expense');
    UI.updateFormContext('expense');
    this.refreshUI();

    this.bindEvents();
  },

  refreshUI() {
    const filteredData = FilterHelper.getFilteredTransactions(
      AppState.transactions,
      AppState.currentFilter
    );

    UI.updateSummary(filteredData);
    UI.renderTransactions(filteredData);
    UI.renderExpenseChart(filteredData);
  },

  bindEvents() {
    const form = document.getElementById('transactionForm');
    const typeRadios = document.querySelectorAll('input[name="transactionType"]');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const transactionList = document.getElementById('transactionList');
    const amountInput = document.getElementById('transactionAmount');

    // Format nominal ribuan saat mengetik
    if (amountInput) {
      amountInput.addEventListener('input', (e) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        if (!rawValue) {
          e.target.value = '';
          return;
        }
        e.target.value = new Intl.NumberFormat('id-ID').format(rawValue);
      });
    }

    // Switch tipe transaksi
    typeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        UI.populateCategories(selectedType);
        UI.updateFormContext(selectedType);
      });
    });

    // Submit formulir
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(form);
      });

      // Tombol Batal Edit
      form.addEventListener('click', (e) => {
        if (e.target.id === 'cancelEditBtn') {
          this.resetEditMode(form);
        }
      });
    }

    
    // Filter tombol waktu
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Mengambil atribut data-period
        AppState.currentFilter = e.target.dataset.period || 'all';
        this.refreshUI();
      });
    });


    // Klik Edit atau Hapus di riwayat
    if (transactionList) {
      transactionList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-action="edit"]');
        const deleteBtn = e.target.closest('[data-action="delete"]');

        if (editBtn) {
          this.handleStartEdit(editBtn.dataset.id);
        } else if (deleteBtn) {
          this.handleDeleteTransaction(deleteBtn.dataset.id);
        }
      });
    }
  },

  handleStartEdit(id) {
    const item = AppState.transactions.find(t => t.id === id);
    if (!item) return;

    AppState.editingId = id;
    UI.fillForm(item);
    UI.setFormEditMode(true);

    const titleInput = document.getElementById('transactionTitle');
    if (titleInput) titleInput.focus();
  },

  resetEditMode(form) {
    AppState.editingId = null;
    form.reset();
    UI.setDefaultDate();
    UI.populateCategories('expense');
    UI.updateFormContext('expense');
    UI.setFormEditMode(false);
  },

  handleFormSubmit(form) {
    const type = form.transactionType.value;
    const date = form.transactionDate.value;
    const title = form.transactionTitle.value.trim();
    const rawAmountString = form.transactionAmount.value.replace(/\./g, '');
    const amount = Number(rawAmountString);
    const category = form.transactionCategory.value;

    if (!title) {
      alert('Nama barang atau keterangan wajib diisi.');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      alert('Nominal harus berupa angka lebih dari 0.');
      return;
    }

    if (!date) {
      alert('Silakan pilih tanggal transaksi.');
      return;
    }

    if (AppState.editingId) {
      const updatedTransaction = {
        id: AppState.editingId,
        type,
        date,
        title,
        amount,
        category
      };

      AppState.transactions = Storage.updateTransaction(updatedTransaction);
      this.resetEditMode(form);
    } else {
      const newTransaction = {
        id: 'trx_' + Date.now(),
        type,
        date,
        title,
        amount,
        category
      };

      AppState.transactions = Storage.addTransaction(newTransaction);
      form.transactionTitle.value = '';
      form.transactionAmount.value = '';
      form.transactionTitle.focus();
    }

    this.refreshUI();
  },

  handleDeleteTransaction(id) {
    const confirmed = confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?');
    if (!confirmed) return;

    AppState.transactions = Storage.deleteTransaction(id);
    
    // Jika data yang sedang diedit ternyata dihapus, reset form
    if (AppState.editingId === id) {
      const form = document.getElementById('transactionForm');
      if (form) this.resetEditMode(form);
    }

    this.refreshUI();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});