const CATEGORIES = {
  expense: [
    '🍜 Makanan & Minuman',
    '🚗 Transportasi',
    '🛍️ Belanja Pribadi',
    '💡 Tagihan & Utilitas',
    '🎮 Hiburan & Rekreasi',
    '📚 Pendidikan & Kuliah',
    '💰 Tabungan / Investasi',
    '📦 Keperluan Lain'
  ],
  income: [
    '💵 Kiriman / Uang Saku',
    '💼 Gaji / Upah Freelance',
    '🎁 Hadiah / Bonus',
    '📈 Investasi / Penjualan',
    '📦 Pemasukan Lain'
  ]
};

const CHART_COLORS = [
  '#f43f5e', '#fb923c', '#facc15', '#38bdf8',
  '#818cf8', '#a855f7', '#34d399', '#94a3b8'
];

let chartInstance = null;

const UI = {
  elements: {
    balance: document.getElementById('totalBalance'),
    balanceStatus: document.getElementById('balanceStatus'),
    income: document.getElementById('totalIncome'),
    expense: document.getElementById('totalExpense'),
    categorySelect: document.getElementById('transactionCategory'),
    transactionList: document.getElementById('transactionList'),
    emptyState: document.getElementById('emptyState'),
    historyCount: document.getElementById('historyCount'),
    dateInput: document.getElementById('transactionDate')
  },

  formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  },

  formatDate(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
  },

  populateCategories(type = 'expense') {
    const list = CATEGORIES[type] || [];
    if (this.elements.categorySelect) {
      this.elements.categorySelect.innerHTML = list
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('');
    }
  },

  updateFormContext(type = 'expense') {
    const label = document.getElementById('transactionTitleLabel');
    const input = document.getElementById('transactionTitle');

    if (!label || !input) return;

    if (type === 'income') {
      label.textContent = 'Keterangan Pemasukan';
      input.placeholder = 'Contoh: Kiriman Orang Tua / Upah Desain';
    } else {
      label.textContent = 'Nama Barang / Keperluan';
      input.placeholder = 'Contoh: Makan Siang Nasi Padang';
    }
  },

  setDefaultDate() {
    if (this.elements.dateInput) {
      const today = new Date().toISOString().split('T')[0];
      this.elements.dateInput.value = today;
    }
  },

  setFormEditMode(isEdit = false) {
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    let cancelBtn = document.getElementById('cancelEditBtn');

    if (isEdit) {
      if (formTitle) formTitle.textContent = 'Edit Transaksi';
      if (submitBtn) submitBtn.textContent = 'Perbarui Transaksi';

      if (!cancelBtn && submitBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'cancelEditBtn';
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = 'Batal Edit';
        submitBtn.insertAdjacentElement('afterend', cancelBtn);
      }
    } else {
      if (formTitle) formTitle.textContent = 'Catat Transaksi';
      if (submitBtn) submitBtn.textContent = 'Simpan Transaksi';
      if (cancelBtn) cancelBtn.remove();
    }
  },

  fillForm(data) {
    const form = document.getElementById('transactionForm');
    if (!form) return;

    form.transactionType.value = data.type;
    this.populateCategories(data.type);
    this.updateFormContext(data.type);

    form.transactionDate.value = data.date;
    form.transactionTitle.value = data.title;
    form.transactionAmount.value = new Intl.NumberFormat('id-ID').format(data.amount);
    form.transactionCategory.value = data.category;
  },

  updateSummary(transactions) {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalIncome - totalExpense;

    if (this.elements.income) this.elements.income.textContent = this.formatRupiah(totalIncome);
    if (this.elements.expense) this.elements.expense.textContent = this.formatRupiah(totalExpense);
    if (this.elements.balance) this.elements.balance.textContent = this.formatRupiah(balance);

    if (this.elements.balanceStatus) {
      if (balance < 0) {
        this.elements.balance.style.color = 'var(--expense)';
        this.elements.balanceStatus.textContent = 'Perhatian: Keuangan Defisit';
        this.elements.balanceStatus.style.color = 'var(--expense)';
      } else {
        this.elements.balance.style.color = 'var(--text-main)';
        this.elements.balanceStatus.textContent = 'Status: Arus Kas Sehat';
        this.elements.balanceStatus.style.color = 'var(--income)';
      }
    }
  },

  renderTransactions(transactions) {
    if (this.elements.historyCount) {
      this.elements.historyCount.textContent = `${transactions.length} Transaksi`;
    }

    if (transactions.length === 0) {
      if (this.elements.transactionList) this.elements.transactionList.innerHTML = '';
      if (this.elements.emptyState) this.elements.emptyState.style.display = 'flex';
      return;
    }

    if (this.elements.emptyState) this.elements.emptyState.style.display = 'none';

    if (this.elements.transactionList) {
      this.elements.transactionList.innerHTML = transactions
        .map(item => {
          const isIncome = item.type === 'income';
          const sign = isIncome ? '+' : '-';
          const amountClass = isIncome ? 'income' : 'expense';

          return `
            <li class="transaction-item" data-id="${item.id}">
              <div class="item-left">
                <span class="item-title">${this.escapeHTML(item.title)}</span>
                <div class="item-meta">
                  <span class="item-badge">${item.category}</span>
                  <span>•</span>
                  <span>${this.formatDate(item.date)}</span>
                </div>
              </div>
              <div class="item-right">
                <span class="item-amount ${amountClass}">
                  ${sign} ${this.formatRupiah(item.amount)}
                </span>
                <button 
                  type="button" 
                  class="edit-btn" 
                  title="Edit Transaksi" 
                  data-action="edit" 
                  data-id="${item.id}">
                  ✎
                </button>
                <button 
                  type="button" 
                  class="delete-btn" 
                  title="Hapus Transaksi" 
                  data-action="delete" 
                  data-id="${item.id}">
                  ✕
                </button>
              </div>
            </li>
          `;
        })
        .join('');
    }
  },

  renderExpenseChart(transactions) {
    const canvas = document.getElementById('expenseDonutChart');
    const breakdownContainer = document.getElementById('categoryBreakdownList');
    const centerTotal = document.getElementById('chartCenterTotal');

    if (!canvas || !breakdownContainer) return;

    if (typeof Chart === 'undefined') {
      console.warn('Library Chart.js belum aktif.');
      return;
    }

    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

    if (centerTotal) {
      centerTotal.textContent = this.formatRupiah(totalExpense);
    }


    if (expenses.length === 0 || totalExpense === 0) {
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      breakdownContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding: 12px 0;">Belum ada data pengeluaran pada periode ini.</p>';
      return;
    }


    const categoryTotals = {};
    expenses.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount);
    });

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);
    const bgColors = labels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);

    
    if (chartInstance) {
      chartInstance.destroy();
    }

    try {
      chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: dataValues,
            backgroundColor: bgColors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` ${this.formatRupiah(context.raw || 0)}`
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Gagal membuat diagram:', err);
    }


    breakdownContainer.innerHTML = labels
      .map((catName, idx) => {
        const amount = categoryTotals[catName];
        const percentage = Math.round((amount / totalExpense) * 100);
        const color = bgColors[idx];

        return `
          <div class="breakdown-row">
            <div class="breakdown-info">
              <span class="category-dot" style="background-color: ${color}"></span>
              <span class="breakdown-name">${catName}</span>
            </div>
            <div class="breakdown-values">
              <span class="breakdown-percentage">${percentage}%</span>
              <span class="breakdown-amount">${this.formatRupiah(amount)}</span>
            </div>
          </div>
        `;
      })
      .join('');
  },

  escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
  }
};