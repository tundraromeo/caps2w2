🧰 I want you to fully refactor and clean my entire backend.php (about 2000+ lines). Follow these exact steps carefully:

Analyze the entire backend code line by line and understand the logic of every case, function, or switch statement.

Identify the purpose of each block (e.g., product entry, update product, add stock, inventory transfer, stock adjustment, user management, reports, etc.).

Group the code into separate PHP files based on purpose. For example:

product_functions.php – product entry, update, add stock, delete product

inventory_functions.php – transfer, stock adjustment, batch tracking

user_functions.php – user creation, roles, login, access

report_functions.php – reports, history, logs

Database connection:

Make sure there is only ONE conn.php file in the project.

Remove any other database connections inside the PHP files.

All PHP files must use the same include 'conn.php'; and no direct mysqli_connect or PDO calls should exist inside any other file.

Clean the code:

Remove all duplicate functions.

If two functions are similar, keep only the one used by the frontend and working correctly.

Delete unused or dead code, commented-out logic, or old connection code.

Simplify and refactor:

Make function names consistent and readable (e.g., addProduct(), updateStock()).

Keep the original logic and return values so the frontend does not break.

Ensure all include paths are correct and relative.

Verify that all functionality remains the same after splitting and refactoring. Nothing should break on the frontend.

(Optional but recommended) Create a short README.md describing each new PHP file and what functions are inside.

✅ Final Goal:

Clean, modular PHP backend (organized by feature).

Only one conn.php file used globally.

No duplicate functions or unnecessary code.

Frontend remains 100% functional after refactor.

Easy to maintain and scale in the future.