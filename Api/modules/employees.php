<?php
// Employee-related API handlers
function handle_add_employee($conn, $data) {
    try {
        $fname = isset($data['fname']) && !empty($data['fname']) ? trim($data['fname']) : '';
        $mname = isset($data['mname']) && !empty($data['mname']) ? trim($data['mname']) : '';
        $lname = isset($data['lname']) && !empty($data['lname']) ? trim($data['lname']) : '';
        $email = isset($data['email']) ? trim($data['email']) : '';
        $contact = isset($data['contact_num']) ? trim($data['contact_num']) : '';
        $role_id = isset($data['role_id']) ? trim($data['role_id']) : '';
        $shift_id = isset($data['shift_id']) && $data['shift_id'] !== null && $data['shift_id'] !== '' ? (int)$data['shift_id'] : null;
        $username = isset($data['username']) ? trim($data['username']) : '';
        $password = isset($data['password']) ? trim($data['password']) : '';
        $age = isset($data['age']) ? trim($data['age']) : '';
        $address = isset($data['address']) ? trim($data['address']) : '';
        $status = isset($data['status']) ? trim($data['status']) : 'Active';
        $gender = isset($data['gender']) ? trim($data['gender']) : '';
        $birthdate = isset($data['birthdate']) ? trim($data['birthdate']) : '';

        // Only require shift_id for cashier (3) and pharmacist (2)
        if (($role_id == 2 || $role_id == 3) && empty($shift_id)) {
            return ["success" => false, "message" => "Shift is required."];
        }

        // Hash the password
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        // Prepare the SQL statement
        $stmt = $conn->prepare("
            INSERT INTO tbl_employee (
                Fname, Mname, Lname, email, contact_num, role_id, shift_id,
                username, password, age, address, status, gender, birthdate
            ) VALUES (
                :fname, :mname, :lname, :email, :contact_num, :role_id, :shift_id,
                :username, :password, :age, :address, :status, :gender, :birthdate
            )
        ");

        // Bind parameters
        $stmt->bindParam(":fname", $fname, PDO::PARAM_STR);
        $stmt->bindParam(":mname", $mname, PDO::PARAM_STR);
        $stmt->bindParam(":lname", $lname, PDO::PARAM_STR);
        $stmt->bindParam(":email", $email, PDO::PARAM_STR);
        $stmt->bindParam(":contact_num", $contact, PDO::PARAM_STR);
        $stmt->bindParam(":role_id", $role_id, PDO::PARAM_INT);
        if ($shift_id !== null) {
            $stmt->bindValue(":shift_id", $shift_id, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(":shift_id", null, PDO::PARAM_NULL);
        }
        $stmt->bindParam(":username", $username, PDO::PARAM_STR);
        $stmt->bindParam(":password", $hashedPassword, PDO::PARAM_STR);
        $stmt->bindParam(":age", $age, PDO::PARAM_INT);
        $stmt->bindParam(":address", $address, PDO::PARAM_STR);
        $stmt->bindParam(":status", $status, PDO::PARAM_STR);
        $stmt->bindParam(":gender", $gender, PDO::PARAM_STR);
        $stmt->bindParam(":birthdate", $birthdate, PDO::PARAM_STR);

        // Execute the statement
        if ($stmt->execute()) {
            return ["success" => true, "message" => "Employee added successfully"];
        } else {
            return ["success" => false, "message" => "Failed to add employee"];
        }
    } catch (Exception $e) {
        return ["success" => false, "message" => "An error occurred: " . $e->getMessage()];
    }
}

function handle_display_employee($conn, $data) {
    try {
        $stmt = $conn->prepare("SELECT emp_id,Fname,Mname,Lname,email,contact_num,role_id,shift_id,username,age,address,status,gender,birthdate FROM tbl_employee");
        $stmt->execute();
        $employee = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($employee) {
            echo json_encode([
                "success" => true,
                "employees" => $employee
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "employees" => [],
                "message" => "No employees found"
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "employees" => []
        ]);
    }
}

function handle_update_employee_status($conn, $data) {
    try {
        $emp_id = isset($data['id']) ? trim($data['id']) : '';
        $newStatus = isset($data['status']) ? trim($data['status']) : '';

        $stmt = $conn->prepare("UPDATE tbl_employee SET status = :status WHERE emp_id = :id");
        $stmt->bindParam(":status", $newStatus, PDO::PARAM_STR);
        $stmt->bindParam(":id", $emp_id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Status updated successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to update status"]);
        }
    } catch (Exception $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
}
