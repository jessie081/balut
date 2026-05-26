# Project Plan

A minimal, SALES-ONLY offline Balut & Penoy inventory and sales tracker. Removed all batch management, incubation, and staff features. Focuses on real-time stock levels ("How many left"), quick 1-tap sales recording with automatic inventory deduction, and a daily sales dashboard. Includes stock restocking and sales history with deletion for corrections. Fixed prices: Balut (₱20), Penoy (₱15), Aboy (₱10).

## Project Brief

# Project Brief: Balut & Penoy Sales Tracker (MVP)

A streamlined, offline-first inventory and sales tracking application designed for Balut vendors. This app replaces
 manual bookkeeping with a high-speed, 1-tap interface focused on real-time stock levels and daily revenue accuracy.

### Features
*   **Real-Time Stock Dashboard**: A high-visibility "How many left" counter for Balut, Penoy, and Aboy, ensuring vendors know exactly when
 to restock.
*   **1-Tap Sales Recording**: Rapid entry buttons with fixed pricing (Balut ₱20, Penoy ₱15, Aboy ₱10) that instantly deduct from inventory and update sales totals.
*   **Inventory Restocking**: A simple input screen
 to quickly add new stock counts as fresh batches arrive.
*   **Sales History & Corrections**: A chronological transaction log that allows users to view recent sales and delete entries to correct manual input errors.
*   **Daily Revenue Dashboard**: An automated summary of total items sold and total cash collected, facilitating effortless end-of-
day auditing.

### High-Level Technical Stack
*   **Language**: Kotlin
*   **UI Framework**: Jetpack Compose (Material 3) for a modern, responsive, and energetic interface.
*   **Local Persistence**: **Room Database** (using **KSP**) to ensure 100
% offline functionality and reliable storage of sales history.
*   **Concurrency**: Kotlin **Coroutines** and **Flow** for reactive UI updates and asynchronous database operations.
*   **Architecture**: MVVM (Model-View-ViewModel) to maintain a clean separation of concerns between sales logic and the UI.

## Implementation Steps

### Task_1_DataLayer: Setup the Room database with KSP, define entities for Staff, Products, and Transactions, and implement the Repository layer using MVVM architecture.
- **Status:** COMPLETED
- **Updates:** Successfully implemented the Room database, entities (Staff, Product, StockIn, Allocation, EggCollection), DAOs, and the Repository layer using Kotlin Coroutines and Flow. The project builds successfully with KSP and Room configuration.
- **Acceptance Criteria:**
  - Room database and entities for staff and products defined
  - Repository implemented with Coroutines and Flow
  - Project builds successfully

### Task_2_StaffAndStockUI: Develop Jetpack Compose screens for managing the staff list and tracking bulk inventory Stock-In entries.
- **Status:** COMPLETED
- **Updates:** Successfully implemented the Staff and Stock-In management screens using Jetpack Compose and Material 3. Configured the application and ViewModel for data persistence and reactive UI updates. Bottom navigation is implemented for seamless switching between screens. Project builds successfully.
- **Acceptance Criteria:**
  - Staff CRUD operations functional
  - Stock-In entry UI working
  - Navigation between management screens implemented

### Task_3_DailyOperationsLedger: Implement the Staff Allocation ledger, Sales/Collection logging for cash and returns, and the End-of-Day Reconciliation dashboard.
- **Status:** COMPLETED
- **Updates:** Successfully implemented the Staff Allocation ledger, Sales/Collection logging for cash and returns, and the End-of-Day Reconciliation dashboard. Added a 5-item bottom navigation bar for seamless navigation between all features. Created an adaptive app icon. Verified that the project builds successfully.
- **Acceptance Criteria:**
  - Staff egg assignment functional
  - Cash and returns logging per staff implemented
  - Reconciliation dashboard calculates balances and discrepancies accurately

### Task_4_UIRefinementAndVerification: Apply Material 3 theme with a vibrant color scheme, implement Edge-to-Edge display, create an adaptive app icon, and perform final verification. Instruct critic_agent to verify application stability, alignment with requirements, and report UI issues.
- **Status:** COMPLETED
- **Updates:** Successfully implemented the final verification and refinement of the Balut & Penoy Inventory Manager app. Applied vibrant Material 3 vibrant theme, implemented full Edge-to-Edge, and created an adaptive app icon. Verified that all features (Staff Management, Stock-In, Allocation, Collection, Reconciliation) are functional and accurately implemented according to the project brief. The app is 100% offline, using Room/KSP, and is architected to handle 50+ staff records without performance degradation. Verified that the project builds successfully.
- **Acceptance Criteria:**
  - Material 3 vibrant color scheme applied
  - Edge-to-Edge display and adaptive icon implemented
  - App does not crash
  - Build pass
  - Make sure all existing tests pass

### Task_5_PivotDataLayer: Refactor the Data Layer to support Batch-based inventory tracking (incubation progress) and direct Sales logging (Balut, Penoy, Aboy), removing legacy staff-management entities.
- **Status:** COMPLETED
- **Updates:** Successfully refactored the Data Layer to support Batch-based inventory tracking and direct Sales logging (Balut, Penoy, Aboy), removing legacy staff-management entities. Defined new Batch and Sale entities in Room. Updated the Repository to handle the new batch lifecycle and sales recording logic. Successfully updated the UI and Navigation to reflect the new structure: Batches, Sales, and Dashboard. Verified that the project builds successfully.
- **Acceptance Criteria:**
  - Batch and Sales entities defined in Room
  - Repository updated for batch lifecycle and real-time stock deduction
  - Legacy staff logic removed
  - Project builds successfully

### Task_6_BatchUIAndThemeUpdate: Implement Batch Management and Quick Sales screens, update the Dashboard for revenue tracking, apply the 'Egg & Yolk' color palette, and perform final verification.
- **Status:** COMPLETED
- **Updates:** Successfully implemented the Batch Management and Quick Sales screens, updated the Dashboard for revenue tracking, applied the 'Egg & Yolk' color palette, and performed final verification. Verified that the batch lifecycle tracking (start/harvest dates) is functional, quick sales recording for Balut, Penoy, and Aboy is implemented, the dashboard summarizes revenue and current stock accurately, and the vibrant 'Egg & Yolk' (Yellow/Orange) theme is applied. The app does not crash, the build passes, and all existing tests pass.
- **Acceptance Criteria:**
  - Batch lifecycle tracking functional (start/harvest dates)
  - Quick sales recording for Balut, Penoy, and Aboy implemented
  - Dashboard summarizes revenue and current stock accurately
  - Vibrant 'Egg & Yolk' (Yellow/Orange) theme applied
  - App does not crash
  - Build pass
  - All existing tests pass

### Task_7_SalesOnlyDataLayer: Refactor the Data Layer for the minimal Sales-Only MVP. Define a simplified Stock entity for real-time counts and a Sale entity for transaction history. Update the Repository to support 1-tap deduction and replenishment logic, removing all legacy batch/staff code.
- **Status:** IN_PROGRESS
- **Acceptance Criteria:**
  - Simplified Stock and Sale entities defined in Room
  - Repository supports 1-tap deduction and replenishment
  - Legacy code removed
  - Project builds successfully
- **StartTime:** 2026-03-19 12:56:39 PST

### Task_8_SalesOnlyUIAndVerification: Implement the high-visibility Sales-Only UI (Stock Monitor, 1-tap Sales, History, Dashboard). Apply a high-contrast outdoor-readable theme. Perform final verification and stability checks. Instruct critic_agent to verify alignment with requirements.
- **Status:** PENDING
- **Acceptance Criteria:**
  - Stock Monitor shows real-time egg counts
  - 1-tap Sales entry functional with fixed pricing (Balut ₱20, Penoy ₱15, Aboy ₱10)
  - Sales history allows deletion for corrections
  - Daily Revenue Summary is accurate
  - High-contrast theme applied
  - App does not crash
  - Build pass
  - Make sure all existing tests pass

