package com.example.balut.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.balut.data.local.entity.Sale
import com.example.balut.data.local.entity.Product
import com.example.balut.data.repository.BalutRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.*

enum class HistoryFilter { TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, ALL, CUSTOM }
enum class SummaryFilter { TODAY, THIS_WEEK, THIS_MONTH }

class BalutViewModel(private val repository: BalutRepository) : ViewModel() {

    val allProducts: StateFlow<List<Product>> = repository.getAllProducts()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allSales: StateFlow<List<Sale>> = repository.getAllSales()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // --- Dashboard States ---
    private val _summaryFilter = MutableStateFlow(SummaryFilter.TODAY)
    val summaryFilter: StateFlow<SummaryFilter> = _summaryFilter.asStateFlow()

    val filteredSummarySales: StateFlow<List<Sale>> = combine(allSales, _summaryFilter) { sales, filter ->
        val now = Calendar.getInstance()
        sales.filter { sale ->
            when (filter) {
                SummaryFilter.TODAY -> isSameDay(sale.timestamp, now)
                SummaryFilter.THIS_WEEK -> isThisWeek(sale.timestamp, now)
                SummaryFilter.THIS_MONTH -> isThisMonth(sale.timestamp, now)
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val summaryRevenue: StateFlow<Double> = filteredSummarySales.map { sales ->
        sales.sumOf { it.totalPrice }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    val summaryItemsSold: StateFlow<Int> = filteredSummarySales.map { sales ->
        sales.sumOf { it.quantity }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    // --- History States ---
    private val _historyFilter = MutableStateFlow(HistoryFilter.TODAY)
    val historyFilter: StateFlow<HistoryFilter> = _historyFilter.asStateFlow()

    private val _startDate = MutableStateFlow<Long?>(null)
    val startDate: StateFlow<Long?> = _startDate.asStateFlow()

    private val _endDate = MutableStateFlow<Long?>(null)
    val endDate: StateFlow<Long?> = _endDate.asStateFlow()

    val filteredHistorySales: StateFlow<List<Sale>> = combine(allSales, _historyFilter, _startDate, _endDate) { sales, filter, start, end ->
        val now = Calendar.getInstance()
        sales.filter { sale ->
            when (filter) {
                HistoryFilter.TODAY -> isSameDay(sale.timestamp, now)
                HistoryFilter.YESTERDAY -> isYesterday(sale.timestamp, now)
                HistoryFilter.THIS_WEEK -> isThisWeek(sale.timestamp, now)
                HistoryFilter.THIS_MONTH -> isThisMonth(sale.timestamp, now)
                HistoryFilter.ALL -> true
                HistoryFilter.CUSTOM -> {
                    val saleTime = sale.timestamp
                    val s = start ?: 0L
                    val e = end ?: Long.MAX_VALUE
                    saleTime in s..e
                }
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // --- Actions ---
    fun setSummaryFilter(filter: SummaryFilter) { _summaryFilter.value = filter }
    fun setHistoryFilter(filter: HistoryFilter) { _historyFilter.value = filter }
    fun setCustomRange(start: Long?, end: Long?) {
        _startDate.value = start
        _endDate.value = end
    }

    private fun isSameDay(timestamp: Long, now: Calendar): Boolean {
        val saleDate = Calendar.getInstance().apply { timeInMillis = timestamp }
        return saleDate.get(Calendar.YEAR) == now.get(Calendar.YEAR) &&
               saleDate.get(Calendar.DAY_OF_YEAR) == now.get(Calendar.DAY_OF_YEAR)
    }

    private fun isYesterday(timestamp: Long, now: Calendar): Boolean {
        val yesterday = (now.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, -1) }
        return isSameDay(timestamp, yesterday)
    }

    private fun isThisWeek(timestamp: Long, now: Calendar): Boolean {
        val weekStart = (now.clone() as Calendar).apply {
            set(Calendar.DAY_OF_WEEK, firstDayOfWeek)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        return timestamp >= weekStart.timeInMillis
    }

    private fun isThisMonth(timestamp: Long, now: Calendar): Boolean {
        val monthStart = (now.clone() as Calendar).apply {
            set(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        return timestamp >= monthStart.timeInMillis
    }

    fun recordSale(product: Product, quantity: Int) {
        if (quantity <= product.count) {
            viewModelScope.launch {
                repository.recordSale(product, quantity)
            }
        }
    }

    fun addProduct(name: String, price: Double, initialStock: Int) {
        viewModelScope.launch {
            repository.addProduct(Product(name = name, unitPrice = price, count = initialStock))
        }
    }

    fun updateProduct(product: Product) {
        viewModelScope.launch {
            repository.updateProduct(product)
        }
    }

    fun deleteProduct(product: Product) {
        viewModelScope.launch {
            repository.deleteProduct(product)
        }
    }

    fun deleteSale(sale: Sale) {
        viewModelScope.launch {
            repository.deleteSale(sale)
        }
    }

    class Factory(private val repository: BalutRepository) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(BalutViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return BalutViewModel(repository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
