package com.example.balut.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sales")
data class Sale(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val productName: String,
    val quantity: Int,
    val unitPrice: Double,
    val totalPrice: Double,
    val timestamp: Long = System.currentTimeMillis()
)
