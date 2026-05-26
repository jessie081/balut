package com.example.balut.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.balut.data.local.entity.Product
import com.example.balut.ui.viewmodel.BalutViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryScreen(viewModel: BalutViewModel) {
    val products by viewModel.allProducts.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<Product?>(null) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Inventory Management") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add Product")
            }
        }
    ) { padding ->
        if (products.isEmpty()) {
            Box(modifier = Modifier.padding(padding).fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No products found. Add your first item!")
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(products) { product ->
                    ProductStockItem(
                        product = product,
                        onEdit = { editingProduct = product },
                        onDelete = { viewModel.deleteProduct(product) }
                    )
                }
            }
        }
    }

    if (showAddDialog) {
        ProductDialog(
            onDismiss = { showAddDialog = false },
            onConfirm = { name, price, stock ->
                viewModel.addProduct(name, price, stock)
                showAddDialog = false
            }
        )
    }

    if (editingProduct != null) {
        ProductDialog(
            initialProduct = editingProduct,
            onDismiss = { editingProduct = null },
            onConfirm = { name, price, stock ->
                viewModel.updateProduct(editingProduct!!.copy(name = name, unitPrice = price, count = stock))
                editingProduct = null
            }
        )
    }
}

@Composable
fun ProductStockItem(product: Product, onEdit: () -> Unit, onDelete: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(product.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Price: ₱${product.unitPrice}", style = MaterialTheme.typography.bodyMedium)
                Text("Current Stock: ${product.count}", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.primary)
            }
            Row {
                IconButton(onClick = onEdit) { Icon(Icons.Default.Edit, contentDescription = "Edit") }
                IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error) }
            }
        }
    }
}

@Composable
fun ProductDialog(
    initialProduct: Product? = null,
    onDismiss: () -> Unit,
    onConfirm: (String, Double, Int) -> Unit
) {
    var name by remember { mutableStateOf(initialProduct?.name ?: "") }
    var price by remember { mutableStateOf(initialProduct?.unitPrice?.toString() ?: "") }
    var stock by remember { mutableStateOf(initialProduct?.count?.toString() ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initialProduct == null) "Add New Product" else "Edit Product") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Product Name") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = price, onValueChange = { price = it }, label = { Text("Price per item (₱)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = stock, onValueChange = { stock = it }, label = { Text("Current Stock Count") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val p = price.toDoubleOrNull() ?: 0.0
                val s = stock.toIntOrNull() ?: 0
                if (name.isNotBlank()) onConfirm(name, p, s)
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
