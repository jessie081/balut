package com.example.balut.data.local.dao

import androidx.room.*
import com.example.balut.data.local.entity.Sale
import com.example.balut.data.local.entity.Product
import kotlinx.coroutines.flow.Flow

@Dao
interface BalutDao {

    // Products
    @Query("SELECT * FROM products")
    fun getAllProducts(): Flow<List<Product>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: Product)

    @Update
    suspend fun updateProduct(product: Product)

    @Delete
    suspend fun deleteProduct(product: Product)

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductById(id: Long): Product?

    @Query("SELECT * FROM products WHERE name = :name")
    suspend fun getProductByName(name: String): Product?

    // Sales
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSale(sale: Sale): Long

    @Query("SELECT * FROM sales ORDER BY timestamp DESC")
    fun getAllSales(): Flow<List<Sale>>

    @Query("DELETE FROM sales WHERE id = :saleId")
    suspend fun deleteSale(saleId: Long)

    @Transaction
    suspend fun recordSaleAndDeductStock(sale: Sale) {
        insertSale(sale)
        val product = getProductByName(sale.productName)
        if (product != null) {
            updateProduct(product.copy(count = product.count - sale.quantity))
        }
    }
}
