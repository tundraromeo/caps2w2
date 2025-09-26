<?php
/**
 * Simple Database Connection Class
 * Clean PDO implementation for easy understanding
 */

class Database {
    private $host = 'localhost';
    private $dbname = 'enguio2';
    private $username = 'root';
    private $password = '';
    private $conn;
    
    public function __construct() {
        $this->connect();
    }
    
    private function connect() {
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->sendError("Database connection failed: " . $e->getMessage());
        }
    }
    
    public function getConnection() {
        return $this->conn;
    }
    
    /**
     * Execute SELECT query and return results
     */
    public function select($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->sendError("Select query failed: " . $e->getMessage());
        }
    }
    
    /**
     * Execute SELECT query and return single row
     */
    public function selectOne($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetch();
        } catch (PDOException $e) {
            $this->sendError("Select one query failed: " . $e->getMessage());
        }
    }
    
    /**
     * Execute INSERT query and return last insert ID
     */
    public function insert($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $this->conn->lastInsertId();
        } catch (PDOException $e) {
            $this->sendError("Insert query failed: " . $e->getMessage());
        }
    }
    
    /**
     * Execute UPDATE query and return affected rows
     */
    public function update($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt->rowCount();
        } catch (PDOException $e) {
            $this->sendError("Update query failed: " . $e->getMessage());
        }
    }
    
    /**
     * Execute DELETE query and return affected rows
     */
    public function delete($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt->rowCount();
        } catch (PDOException $e) {
            $this->sendError("Delete query failed: " . $e->getMessage());
        }
    }
    
    /**
     * Begin transaction
     */
    public function beginTransaction() {
        return $this->conn->beginTransaction();
    }
    
    /**
     * Commit transaction
     */
    public function commit() {
        return $this->conn->commit();
    }
    
    /**
     * Rollback transaction
     */
    public function rollback() {
        return $this->conn->rollback();
    }
    
    /**
     * Send error response and exit
     */
    private function sendError($message) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => $message
        ]);
        exit;
    }
}
?>
