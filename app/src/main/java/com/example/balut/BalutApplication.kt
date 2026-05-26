package com.example.balut

import android.app.Application
import androidx.room.Room
import com.example.balut.data.local.AppDatabase
import com.example.balut.data.repository.BalutRepository

class BalutApplication : Application() {
    lateinit var database: AppDatabase
        private set
    
    lateinit var repository: BalutRepository
        private set

    override fun onCreate() {
        super.onCreate()
        database = Room.databaseBuilder(
            this,
            AppDatabase::class.java,
            "balut_database"
        ).build()
        repository = BalutRepository(database.balutDao())
    }
}
