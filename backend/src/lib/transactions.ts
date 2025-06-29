// backend/src/lib/transactions.ts
// Safe transaction wrapper for Supabase operations

import { supabase } from './supabase';

/**
 * Execute multiple operations in a transaction
 * Provides rollback capability for data consistency
 */
export interface TransactionOperation {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  conditions?: any;
  select?: string;
}

export interface TransactionResult {
  success: boolean;
  data?: any[];
  error?: string;
  rollbackPerformed?: boolean;
}

/**
 * Execute operations in a transaction with automatic rollback
 * 
 * @param operations Array of database operations to execute
 * @returns Promise<TransactionResult>
 */
export const executeTransaction = async (
  operations: TransactionOperation[]
): Promise<TransactionResult> => {
  // For now, we'll implement a basic transaction using try/catch
  // In a future version, we can upgrade to Supabase's native transactions
  
  const completedOperations: any[] = [];
  const results: any[] = [];
  
  try {
    console.log(`🔄 Starting transaction with ${operations.length} operations`);
    
    // Execute each operation in sequence
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      console.log(`📋 Executing operation ${i + 1}: ${op.operation} on ${op.table}`);
      
      let result;
      
      switch (op.operation) {
        case 'insert':
          const insertQuery = supabase.from(op.table).insert(op.data);
          if (op.select) {
            insertQuery.select(op.select);
          }
          const { data: insertData, error: insertError } = await insertQuery;
          
          if (insertError) throw insertError;
          result = insertData;
          break;
          
        case 'update':
          if (!op.conditions) {
            throw new Error(`Update operation on ${op.table} requires conditions`);
          }
          
          let updateQuery = supabase.from(op.table).update(op.data);
          
          // Apply conditions dynamically
          Object.keys(op.conditions).forEach(key => {
            updateQuery = updateQuery.eq(key, op.conditions[key]);
          });
          
          if (op.select) {
            updateQuery.select(op.select);
          }
          
          const { data: updateData, error: updateError } = await updateQuery;
          
          if (updateError) throw updateError;
          result = updateData;
          break;
          
        case 'delete':
          if (!op.conditions) {
            throw new Error(`Delete operation on ${op.table} requires conditions`);
          }
          
          let deleteQuery = supabase.from(op.table).delete();
          
          // Apply conditions dynamically  
          Object.keys(op.conditions).forEach(key => {
            deleteQuery = deleteQuery.eq(key, op.conditions[key]);
          });
          
          const { data: deleteData, error: deleteError } = await deleteQuery;
          
          if (deleteError) throw deleteError;
          result = deleteData;
          break;
          
        default:
          throw new Error(`Unsupported operation: ${op.operation}`);
      }
      
      // Track completed operation for potential rollback
      completedOperations.push({
        index: i,
        operation: op,
        result: result
      });
      
      results.push(result);
      console.log(`✅ Operation ${i + 1} completed successfully`);
    }
    
    console.log(`✅ All ${operations.length} operations completed successfully`);
    
    return {
      success: true,
      data: results
    };
    
  } catch (error) {
    console.error(`❌ Transaction failed at operation ${completedOperations.length + 1}:`, error);
    
    // Attempt rollback of completed operations
    let rollbackPerformed = false;
    
    if (completedOperations.length > 0) {
      console.log(`🔄 Attempting rollback of ${completedOperations.length} completed operations...`);
      rollbackPerformed = await attemptRollback(completedOperations);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transaction error',
      rollbackPerformed
    };
  }
};

/**
 * Attempt to rollback completed operations (best effort)
 * Note: This is a basic implementation. In production, consider using
 * database-level transactions or saga patterns for complex scenarios.
 */
const attemptRollback = async (completedOperations: any[]): Promise<boolean> => {
  let rollbackSuccessful = true;
  
  // Rollback in reverse order
  for (let i = completedOperations.length - 1; i >= 0; i--) {
    const { operation, result } = completedOperations[i];
    
    try {
      switch (operation.operation) {
        case 'insert':
          // Rollback insert by deleting the created record(s)
          if (result && Array.isArray(result) && result.length > 0) {
            for (const record of result) {
              if (record.id) {
                await supabase.from(operation.table).delete().eq('id', record.id);
                console.log(`🔄 Rolled back insert on ${operation.table}: ${record.id}`);
              }
            }
          }
          break;
          
        case 'update':
          // For updates, we'd need to store the original values to restore them
          // This is a limitation of this basic approach
          console.log(`⚠️ Cannot rollback update on ${operation.table} - original data not stored`);
          break;
          
        case 'delete':
          // For deletes, we'd need to restore the deleted records
          // This requires storing the original data before deletion
          console.log(`⚠️ Cannot rollback delete on ${operation.table} - original data not stored`);
          break;
      }
    } catch (rollbackError) {
      console.error(`❌ Rollback failed for operation on ${operation.table}:`, rollbackError);
      rollbackSuccessful = false;
    }
  }
  
  if (rollbackSuccessful) {
    console.log(`✅ Rollback completed successfully`);
  } else {
    console.log(`⚠️ Rollback completed with some failures - manual cleanup may be required`);
  }
  
  return rollbackSuccessful;
};

/**
 * Helper function to create a member renewal transaction
 * This encapsulates the specific operations needed for renewal
 */
export const createRenewalTransaction = (
  renewalData: any,
  memberUpdateData: any,
  actionLogData: any
): TransactionOperation[] => {
  return [
    {
      table: 'member_renewals',
      operation: 'insert',
      data: renewalData,
      select: '*'
    },
    {
      table: 'members',
      operation: 'update',
      data: memberUpdateData,
      conditions: { id: memberUpdateData.memberId || renewalData.member_id },
      select: '*'
    },
    {
      table: 'staff_actions_log',
      operation: 'insert',
      data: actionLogData,
      select: '*'
    }
  ];
};

/**
 * Helper function to create a member creation transaction
 */
export const createMemberCreationTransaction = (
  memberData: any,
  actionLogData: any
): TransactionOperation[] => {
  return [
    {
      table: 'members',
      operation: 'insert',
      data: memberData,
      select: '*'
    },
    {
      table: 'staff_actions_log',
      operation: 'insert',
      data: actionLogData,
      select: '*'
    }
  ];
};

export default {
  executeTransaction,
  createRenewalTransaction,
  createMemberCreationTransaction
};