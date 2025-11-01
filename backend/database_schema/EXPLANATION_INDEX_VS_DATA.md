# Index vs Data - Explanation

## Ano ang Index?

**Index = Para sa Performance, HINDI para sa Data Storage**

### Simple Explanation:

```
┌─────────────────────────────────────┐
│ TABLE: tbl_purchase_order_dtl      │
├─────────────────────────────────────┤
│ DATA (Actual Information):         │
│ ┌─────────┬────────────┬──────────┐│
│ │purchase_│product_id  │product_  ││
│ │dtl_id   │            │name      ││
│ ├─────────┼────────────┼──────────┤│
│ │   1     │   50       │ Paracet  ││ ← DATA (pangetrain mo)
│ │   2     │   NULL     │ Asmacaire││ ← DATA (kailangan mo i-fill)
│ │   3     │   51       │ Biogesic ││ ← DATA
│ └─────────┴────────────┴──────────┘│
│                                     │
│ INDEX (Speed Helper):               │
│ [product_id] → Fast search pointer  │ ← HINDI data, pangetrain lang
│ [purchase_header_id] → Fast pointer│ ← HINDI data, pangetrain lang
└─────────────────────────────────────┘
```

## Difference:

| Item | Purpose | Example |
|------|---------|---------|
| **DATA (Column)** | Storage ng actual values | `product_id = 50` or `NULL` |
| **INDEX** | Speed up queries | Makes `WHERE product_id = 50` faster |

## Common Mistake:

❌ **WRONG**: "Index para ma-fill ang NULL values"  
✅ **CORRECT**: "Index para mabilis ang queries. Para ma-fill ang NULL, kailangan UPDATE query."

## Kailangan Mo:

### 1. Para ma-fill ang NULL product_id (Data):
Run: **`purchase_order_populate_null_product_ids.sql`**

```sql
UPDATE tbl_purchase_order_dtl pod
INNER JOIN tbl_product p ON p.product_name = pod.product_name
SET pod.product_id = p.product_id  -- ← ITO ang nagfi-fill ng data
WHERE pod.product_id IS NULL;
```

### 2. Para mabilis ang queries (Performance):
Index ay automatic na nag-c create kapag may Foreign Key constraint. Hindi mo na kailangan manual mag-create.

## Summary:

- **Index** = Para mabilis ang searches/queries ⚡
- **UPDATE query** = Para ma-fill ang NULL values 📝

 Parehong bagay! Index ay para sa speed, ang UPDATE ay para sa data.

