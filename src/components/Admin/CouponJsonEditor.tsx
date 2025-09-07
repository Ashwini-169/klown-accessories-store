import React, { useState, useEffect } from 'react';
import { useProducts } from '../../context/ProductContext';
import { Save, AlertCircle, CheckCircle, RotateCcw, File } from 'lucide-react';
import { couponSyncUtils } from '../../utils/couponSyncUtils';

const CouponJsonEditor: React.FC = () => {
  const { coupons, updateCoupons } = useProducts();
  const [jsonContent, setJsonContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Initial load of coupons
  useEffect(() => {
    try {
      const formattedJson = JSON.stringify(coupons, null, 2);
      setJsonContent(formattedJson);
    } catch (err) {
      setError('Failed to load coupon data');
      console.error('Error loading coupons:', err);
    }
  }, [coupons]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonContent(e.target.value);
    setIsDirty(true);
    setError(null);
    setSuccess(null);
  };

  const validateJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        setError('JSON must be an array of coupon objects');
        return false;
      }
      return true;
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    
    if (!validateJson(jsonContent)) {
      return;
    }
    
    try {
      setIsLoading(true);
      const parsedCoupons = JSON.parse(jsonContent);
      
      // Check for duplicate IDs
      const ids = parsedCoupons.map((c: any) => c.id);
      const duplicateIds = ids.filter((id: string, index: number) => ids.indexOf(id) !== index);
      
      if (duplicateIds.length > 0) {
        setError(`Warning: Duplicate coupon IDs found: ${duplicateIds.join(', ')}`);
        // We'll still save, but show the warning
      }
      
      // Update coupons in context
      updateCoupons(parsedCoupons);
      
      // Sync to file
      const synced = await couponSyncUtils.syncCoupons(parsedCoupons);
      
      if (synced) {
        setSuccess('Coupons saved successfully to coupons.json');
        setIsDirty(false);
      } else {
        throw new Error('Failed to sync coupons to file');
      }
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error saving coupons:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    try {
      const formattedJson = JSON.stringify(coupons, null, 2);
      setJsonContent(formattedJson);
      setIsDirty(false);
      setError(null);
      setSuccess('Content reset to original');
    } catch (err) {
      setError('Failed to reset content');
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
      setSuccess('JSON formatted successfully');
    } catch (err) {
      setError(`Cannot format invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Edit coupons.json Directly</h2>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleFormat}
            disabled={isLoading}
          >
            <File className="h-4 w-4 mr-2" />
            Format JSON
          </button>
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded-md flex items-center hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleReset}
            disabled={isLoading || !isDirty}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={isLoading || !isDirty}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save to coupons.json'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-start">
          <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">
          Edit the JSON content below. This will directly update your coupons.json file.
        </p>
      </div>

      <div className="relative">
        <textarea
          value={jsonContent}
          onChange={handleJsonChange}
          rows={25}
          className="w-full p-4 border border-gray-300 rounded-md font-mono text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Loading coupons data..."
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
            <span className="text-lg font-medium text-gray-700">Saving...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponJsonEditor;
