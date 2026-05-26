package com.example.balut.data.repository

import com.example.balut.data.local.dao.BalutDao
import com.example.balut.data.local.entity.Sale
import com.example.balut.data.local.entity.Product
import kotlinx.coroutines.flow.Flow

class BalutRepository (
    private val balutDao: BalutDao
) {
    // Products
    fun getAllProducts(): Flow<List<Product>> = balutDao.getAllProducts()

    suspend fun addProduct(product: Product) = balutDao.insertProduct(product)

    suspend fun updateProduct(product: Product) = balutDao.updateProduct(product)

    suspend fun deleteProduct(product: Product) = balutDao.deleteProduct(product)

    suspend fun getProductById(id: Long) = balutDao.getProductById(id)

    // Sales
    fun getAllSales(): Flow<List<Sale>> = balutDao.getAllSales()

    suspend fun recordSale(product: Product, quantity: Int) {
        val sale = Sale(
            productName = product.name,
            quantity = quantity,
            unitPrice = product.unitPrice,
            totalPrice = quantity * product.unitPrice
        )
        balutDao.recordSaleAndDeductStock(sale)
    }

    suspend fun deleteSale(sale: Sale) {
        // Find product to restore stock
        val product = balutDao.getProductByName(sale.productName)
        if (product != null) {
            balutDao.updateProduct(product.copy(count = product.count + sale.quantity))
        }
        balutDao.deleteSale(sale.id)
    }
}
