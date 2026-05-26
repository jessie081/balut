package com.example.balut.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.balut.data.local.entity.Product
import com.example.balut.ui.viewmodel.BalutViewModel
import com.example.balut.ui.viewmodel.SummaryFilter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: BalutViewModel) {
    val products by viewModel.allProducts.collectAsState()
    val revenue by viewModel.summaryRevenue.collectAsState()
    val itemsSold by viewModel.summaryItemsSold.collectAsState()
    val currentFilter by viewModel.summaryFilter.collectAsState()

    var showFilterMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sales Dashboard") },
                actions = {
                    Box {
                        IconButton(onClick = { showFilterMenu = true }) {
                            Icon(Icons.Default.FilterAlt, contentDescription = "Filter Summary")
                        }
                        DropdownMenu(
                            expanded = showFilterMenu,
                            onDismissRequest = { showFilterMenu = false }
                        ) {
                            SummaryFilter.entries.forEach { filter ->
                                DropdownMenuItem(
                                    text = { Text(filter.name.lowercase().replaceFirstChar { it.uppercase() }.replace("_", " ")) },
                                    onClick = {
                                        viewModel.setSummaryFilter(filter)
                                        showFilterMenu = false
                                    }
                                )
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                RevenueSummaryCard(
                    revenue = revenue,
                    totalItems = itemsSold,
                    filterLabel = currentFilter.name.lowercase().replace("_", " ")
                )
            }
            item {
                Text("Current Inventory Levels", style = MaterialTheme.typography.titleMedium)
            }
            if (products.isEmpty()) {
                item {
                    Text("No products tracked. Add items in 'Stock'.", color = MaterialTheme.colorScheme.secondary)
                }
            } else {
                items(products) { product ->
                    StockLevelItem(product)
                }
            }
        }
    }
}

@Composable
fun RevenueSummaryCard(revenue: Double, totalItems: Int, filterLabel: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Summary (${filterLabel})", style = MaterialTheme.typography.labelLarge)
            Text(
                "₱${String.format("%.2f", revenue)}",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                "Items Sold: $totalItems",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun StockLevelItem(product: Product) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (product.count <= 10) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(product.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(
                "${product.count} left",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color = if (product.count <= 10) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}
