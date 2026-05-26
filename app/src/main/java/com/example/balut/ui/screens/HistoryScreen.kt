package com.example.balut.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.balut.data.local.entity.Sale
import com.example.balut.ui.viewmodel.BalutViewModel
import com.example.balut.ui.viewmodel.HistoryFilter
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(viewModel: BalutViewModel) {
    val sales by viewModel.filteredHistorySales.collectAsState()
    val currentFilter by viewModel.historyFilter.collectAsState()
    
    var showFilterMenu by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sales History") },
                actions = {
                    IconButton(onClick = { showFilterMenu = true }) {
                        Icon(Icons.Default.FilterList, contentDescription = "Filter")
                    }
                    DropdownMenu(
                        expanded = showFilterMenu,
                        onDismissRequest = { showFilterMenu = false }
                    ) {
                        HistoryFilter.entries.forEach { filter ->
                            DropdownMenuItem(
                                text = { Text(filter.name.lowercase().replaceFirstChar { it.uppercase() }.replace("_", " ")) },
                                onClick = {
                                    if (filter == HistoryFilter.CUSTOM) {
                                        showDatePicker = true
                                    } else {
                                        viewModel.setHistoryFilter(filter)
                                    }
                                    showFilterMenu = false
                                }
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Active Filter Chip
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surfaceVariant,
                tonalElevation = 2.dp
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Viewing: ${currentFilter.name.lowercase().replace("_", " ")}",
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }

            if (sales.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No records found for this period", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(sales) { sale ->
                        HistoryItem(sale) {
                            viewModel.deleteSale(sale)
                        }
                    }
                }
            }
        }
    }

    if (showDatePicker) {
        val datePickerState = rememberDateRangePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.setCustomRange(datePickerState.selectedStartDateMillis, datePickerState.selectedEndDateMillis)
                    viewModel.setHistoryFilter(HistoryFilter.CUSTOM)
                    showDatePicker = false
                }) { Text("Apply") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Cancel") }
            }
        ) {
            DateRangePicker(
                state = datePickerState,
                modifier = Modifier.weight(1f).padding(16.dp),
                title = { Text("Select Date Range") }
            )
        }
    }
}

@Composable
fun HistoryItem(sale: Sale, onDelete: () -> Unit) {
    val sdf = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(sale.productName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("${sale.quantity} pcs @ ₱${sale.unitPrice}", style = MaterialTheme.typography.bodyMedium)
                Text(sdf.format(Date(sale.timestamp)), style = MaterialTheme.typography.labelSmall, color = Color.Gray)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("₱${sale.totalPrice}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Red, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}
