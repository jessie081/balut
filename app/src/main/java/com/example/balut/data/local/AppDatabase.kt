package com.example.balut.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.balut.data.local.dao.BalutDao
import com.example.balut.data.local.entity.Sale
import com.example.balut.data.local.entity.Product

@Database(
    entities = [
        Product::class,
        Sale::class
    ],
    version = 4,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun balutDao(): BalutDao
}
