const AppState = {
  currentFilter: 'all',
  editingId: null,
  transactions: []
};

const FilterHelper = {
  getFilteredTransactions(transactions, filterType) {
    if (!filterType || filterType === 'all') return transactions;

    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');

    // Tanggal hari ini
    const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Kemarin (H-1)
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayISO = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    // Minggu Ini (Senin - Minggu berjalan)
    const currentDay = now.getDay();
    const distToMon = (currentDay + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Minggu Lalu (Senin - Minggu pekan sebelumnya)
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setMilliseconds(-1);

    // Bulan Ini & Bulan Lalu
    const thisMonthISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthISO = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`;

    // Tahun Ini & Tahun Lalu
    const thisYearISO = String(now.getFullYear());
    const lastYearISO = String(now.getFullYear() - 1);

    return transactions.filter(item => {
      if (!item.date) return false;

      switch (filterType) {
        case 'daily':
          return item.date === todayISO;

        case 'yesterday':
          return item.date === yesterdayISO;

        case 'weekly': {
          const d = new Date(`${item.date}T00:00:00`);
          return d >= startOfWeek && d <= endOfWeek;
        }

        case 'last-week': {
          const d = new Date(`${item.date}T00:00:00`);
          return d >= startOfLastWeek && d <= endOfLastWeek;
        }

        case 'monthly':
          return item.date.startsWith(thisMonthISO);

        case 'last-month':
          return item.date.startsWith(lastMonthISO);

        case 'yearly':
          return item.date.startsWith(thisYearISO);

        case 'last-year':
          return item.date.startsWith(lastYearISO);

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
// Filter modern 2 tingkat (Unit Waktu + Sub Toggle)
    let activeUnit = 'all';
    let activeShift = 'current';

    const unitButtons = document.querySelectorAll('.unit-btn');
    const shiftButtons = document.querySelectorAll('.shift-btn');
    const shiftContainer = document.getElementById('shiftControl');

    const resolvePeriodKey = (unit, shift) => {
      if (unit === 'all') return 'all';
      if (unit === 'day') return shift === 'current' ? 'daily' : 'yesterday';
      if (unit === 'week') return shift === 'current' ? 'weekly' : 'last-week';
      if (unit === 'month') return shift === 'current' ? 'monthly' : 'last-month';
      if (unit === 'year') return shift === 'current' ? 'yearly' : 'last-year';
      return 'all';
    };

    // Klik tombol Baris 1 (Semua, Hari, Minggu, Bulan, Tahun)
    unitButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        unitButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        activeUnit = e.target.dataset.unit;

        if (activeUnit === 'all') {
          if (shiftContainer) shiftContainer.style.display = 'none';
        } else {
          if (shiftContainer) {
            shiftContainer.style.display = 'inline-flex';

            const currentBtn = shiftContainer.querySelector('[data-shift="current"]');
            const prevBtn = shiftContainer.querySelector('[data-shift="previous"]');

            if (activeUnit === 'day') {
              if (currentBtn) currentBtn.textContent = 'Hari Ini';
              if (prevBtn) prevBtn.textContent = 'Kemarin';
            } else if (activeUnit === 'week') {
              if (currentBtn) currentBtn.textContent = 'Minggu Ini';
              if (prevBtn) prevBtn.textContent = 'Minggu Lalu';
            } else if (activeUnit === 'month') {
              if (currentBtn) currentBtn.textContent = 'Bulan Ini';
              if (prevBtn) prevBtn.textContent = 'Bulan Lalu';
            } else if (activeUnit === 'year') {
              if (currentBtn) currentBtn.textContent = 'Tahun Ini';
              if (prevBtn) prevBtn.textContent = 'Tahun Lalu';
            }
          }
        }

        AppState.currentFilter = resolvePeriodKey(activeUnit, activeShift);
        this.refreshUI();
      });
    });

    // Klik tombol Baris 2 (Sekarang / Sebelumnya)
    shiftButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        shiftButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        activeShift = e.target.dataset.shift;
        AppState.currentFilter = resolvePeriodKey(activeUnit, activeShift);
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