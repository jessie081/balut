package com.example.balut

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.balut.ui.screens.*
import com.example.balut.ui.theme.BalutTheme
import com.example.balut.ui.viewmodel.BalutViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        val viewModel: BalutViewModel by viewModels {
            BalutViewModel.Factory((application as BalutApplication).repository)
        }

        setContent {
            BalutTheme {
                MainScreen(viewModel)
            }
        }
    }
}

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Home", Icons.Default.Dashboard)
    object Sell : Screen("sell", "Sell", Icons.Default.PointOfSale)
    object Inventory : Screen("inventory", "Stock", Icons.Default.Inventory)
    object History : Screen("history", "History", Icons.Default.History)
}

@Composable
fun MainScreen(viewModel: BalutViewModel) {
    val navController = rememberNavController()
    val items = listOf(
        Screen.Dashboard,
        Screen.Sell,
        Screen.Inventory,
        Screen.History
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                items.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = null) },
                        label = { Text(screen.label) },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Dashboard.route) { DashboardScreen(viewModel) }
            composable(Screen.Sell.route) { SalesScreen(viewModel) }
            composable(Screen.Inventory.route) { InventoryScreen(viewModel) }
            composable(Screen.History.route) { HistoryScreen(viewModel) }
        }
    }
}
