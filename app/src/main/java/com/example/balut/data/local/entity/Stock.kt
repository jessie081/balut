package com.example.balut.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "stock")
data class Stock(
    @PrimaryKey val productType: String, // "Balut", "Penoy", "Aboy"
    val count: Int
)
