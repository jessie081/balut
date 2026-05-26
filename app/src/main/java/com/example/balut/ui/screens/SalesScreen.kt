package com.example.balut.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.balut.data.local.entity.Product
import com.example.balut.ui.viewmodel.BalutViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesScreen(viewModel: BalutViewModel) {
    val products by viewModel.allProducts.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Quick Sell") }) },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { padding ->
        if (products.isEmpty()) {
            Box(modifier = Modifier.padding(padding).fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No products added. Go to Stock first.")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(products) { product ->
                    SaleProductItem(product) { qty ->
                        viewModel.recordSale(product, qty)
                        scope.launch {
                            snackbarHostState.currentSnackbarData?.dismiss()
                            snackbarHostState.showSnackbar(
                                message = "Sold $qty ${product.name} - ₱${qty * product.unitPrice}",
                                duration = SnackbarDuration.Short
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SaleProductItem(product: Product, onSell: (Int) -> Unit) {
    var qtyInput by remember { mutableStateOf("1") }
    val sellQty = qtyInput.toIntOrNull() ?: 0
    val isError = sellQty <= 0 || sellQty > product.count

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(product.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("₱${product.unitPrice} each", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "In Stock: ${product.count}", 
                        style = MaterialTheme.typography.labelLarge, 
                        color = if (product.count < 10) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(
                    "Total: ₱${sellQty * product.unitPrice}", 
                    style = MaterialTheme.typography.headlineSmall, 
                    color = if (isError) MaterialTheme.colorScheme.error.copy(alpha = 0.5f) else MaterialTheme.colorScheme.primary
                )
            }

            Spacer(Modifier.height(16.dp))

            // Quick Buttons
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { qtyInput = "1" }, modifier = Modifier.weight(1f)) { Text("1") }
                Button(onClick = { qtyInput = "5" }, modifier = Modifier.weight(1f)) { Text("5") }
                Button(onClick = { qtyInput = "10" }, modifier = Modifier.weight(1f)) { Text("10") }
                OutlinedButton(onClick = { qtyInput = product.count.toString() }, modifier = Modifier.weight(1f)) { Text("ALL") }
            }

            Spacer(Modifier.height(12.dp))

            // Manual Input & Precise Adjustment
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                IconButton(onClick = { if (sellQty > 1) qtyInput = (sellQty - 1).toString() }) {
                    Icon(Icons.Default.Remove, contentDescription = "Decrease")
                }
                
                OutlinedTextField(
                    value = qtyInput,
                    onValueChange = { input ->
                        if (input.all { it.isDigit() }) {
                            qtyInput = input
                        }
                    },
                    label = { Text("Quantity") },
                    modifier = Modifier.width(120.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    isError = isError,
                    supportingText = {
                        if (sellQty > product.count) {
                            Text("Exceeds stock!")
                        }
                    }
                )

                IconButton(onClick = { if (sellQty < product.count) qtyInput = (sellQty + 1).toString() }) {
                    Icon(Icons.Default.Add, contentDescription = "Increase")
                }
            }

            Spacer(Modifier.height(8.dp))

            Button(
                onClick = { onSell(sellQty) },
                enabled = !isError,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Confirm Sale")
            }
        }
    }
}
