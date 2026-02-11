import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface LabTest {
  id: string;
  test_type: string;
  test_name: string;
  ordered_by: string;
  ordered_at: string;
  scheduled_date: string | null;
  status: 'ORDERED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  instructions: string | null;
}

interface TestResult {
  id: string;
  lab_test_id: string;
  result_date: string;
  result_status: 'PRELIMINARY' | 'FINAL' | 'CORRECTED';
  result_value: string | null;
  result_unit: string | null;
  reference_range: string | null;
  abnormal_flag: string | null;
  interpretation: string | null;
  is_critical: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const SeniorLabTestsPage: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    if (selectedResidentId) {
      loadData();
    }
  }, [selectedResidentId, filter]);

  const loadData = async () => {
    if (!selectedResidentId) return;

    setLoading(true);
    try {
      // Load lab tests
      let query = supabase
        .from('lab_tests')
        .select('*')
        .eq('resident_id', selectedResidentId)
        .order('scheduled_date', { ascending: false, nullsFirst: false })
        .order('ordered_at', { ascending: false });

      if (filter === 'pending') {
        query = query.in('status', ['ORDERED', 'SCHEDULED']);
      } else if (filter === 'completed') {
        query = query.eq('status', 'COMPLETED');
      }

      const { data: testsData, error: testsError } = await query;

      if (testsError) throw testsError;

      setLabTests(testsData || []);

      // Load results for completed tests
      if (testsData && testsData.length > 0) {
        const completedTestIds = testsData
          .filter(t => t.status === 'COMPLETED')
          .map(t => t.id);

        if (completedTestIds.length > 0) {
          const { data: resultsData, error: resultsError } = await supabase
            .from('test_results')
            .select('*')
            .in('lab_test_id', completedTestIds)
            .order('result_date', { ascending: false });

          if (resultsError) throw resultsError;

          // Group results by test ID
          const groupedResults: Record<string, TestResult[]> = {};
          (resultsData || []).forEach((result: TestResult) => {
            if (!groupedResults[result.lab_test_id]) {
              groupedResults[result.lab_test_id] = [];
            }
            groupedResults[result.lab_test_id].push(result);
          });

          setTestResults(groupedResults);
        }
      }
    } catch (err) {
      console.error('Error loading lab tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'SCHEDULED': return '#3b82f6';
      case 'ORDERED': return '#f59e0b';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'STAT': return '#ef4444';
      case 'URGENT': return '#f59e0b';
      case 'ROUTINE': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getAbnormalFlagBadge = (flag: string | null) => {
    if (!flag) return null;

    const colors: Record<string, string> = {
      'H': '#ef4444',  // High - red
      'L': '#3b82f6',  // Low - blue
      'HH': '#dc2626', // Critical high - dark red
      'LL': '#1e40af', // Critical low - dark blue
      'A': '#f59e0b'   // Abnormal - amber
    };

    return (
      <span style={{
        background: colors[flag] || '#6b7280',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '700',
        marginLeft: '8px'
      }}>
        {flag}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading lab tests...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '32px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          color: '#1a1a1a'
        }}>
          Lab Tests & Results
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: 0
        }}>
          View your medical test results and upcoming lab appointments
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        {[
          { key: 'all', label: 'All Tests' },
          { key: 'pending', label: 'Pending' },
          { key: 'completed', label: 'Completed' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              background: 'transparent',
              color: filter === tab.key ? '#3b82f6' : '#6b7280',
              borderBottom: filter === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lab Tests List */}
      {labTests.length === 0 ? (
        <div style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔬</div>
          <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a' }}>
            No lab tests found
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            {filter === 'pending' ? 'No pending lab tests' : filter === 'completed' ? 'No completed lab tests' : 'No lab tests ordered yet'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {labTests.map(test => {
            const results = testResults[test.id] || [];
            const hasNewResults = results.some(r => !r.reviewed_at);

            return (
              <div
                key={test.id}
                style={{
                  background: 'white',
                  border: `2px solid ${selectedTest === test.id ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: results.length > 0 ? 'pointer' : 'default'
                }}
                onClick={() => results.length > 0 && setSelectedTest(selectedTest === test.id ? null : test.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        margin: 0,
                        color: '#1a1a1a'
                      }}>
                        {test.test_name}
                      </h3>
                      {hasNewResults && (
                        <span style={{
                          background: '#ef4444',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          marginLeft: '12px'
                        }}>
                          NEW RESULTS
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '16px', color: '#666', marginBottom: '4px' }}>
                      {test.test_type} • Ordered by {test.ordered_by}
                    </div>
                    {test.scheduled_date && (
                      <div style={{ fontSize: '16px', color: '#666' }}>
                        📅 Scheduled: {formatDate(test.scheduled_date)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{
                      background: getStatusColor(test.status),
                      color: 'white',
                      padding: '6px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {test.status}
                    </span>
                    <span style={{
                      background: getPriorityColor(test.priority),
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {test.priority}
                    </span>
                  </div>
                </div>

                {test.instructions && (
                  <div style={{
                    background: '#f3f4f6',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: '#374151',
                    marginTop: '12px'
                  }}>
                    <strong>Instructions:</strong> {test.instructions}
                  </div>
                )}

                {/* Results Section */}
                {selectedTest === test.id && results.length > 0 && (
                  <div style={{
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '2px solid #e5e7eb'
                  }}>
                    <h4 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '16px',
                      color: '#1a1a1a'
                    }}>
                      Test Results ({results.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {results.map(result => (
                        <div
                          key={result.id}
                          style={{
                            background: result.is_critical ? '#fef2f2' : '#f9fafb',
                            border: `2px solid ${result.is_critical ? '#fecaca' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            padding: '16px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                                {formatDate(result.result_date)}
                              </div>
                              <div style={{ fontSize: '14px', color: '#666' }}>
                                Status: <strong>{result.result_status}</strong>
                              </div>
                            </div>
                            {result.is_critical && (
                              <span style={{
                                background: '#ef4444',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                height: 'fit-content'
                              }}>
                                CRITICAL
                              </span>
                            )}
                          </div>

                          {result.result_value && (
                            <div style={{ marginBottom: '8px' }}>
                              <span style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>
                                {result.result_value} {result.result_unit}
                              </span>
                              {result.abnormal_flag && getAbnormalFlagBadge(result.abnormal_flag)}
                            </div>
                          )}

                          {result.reference_range && (
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                              Reference Range: {result.reference_range}
                            </div>
                          )}

                          {result.interpretation && (
                            <div style={{
                              background: 'white',
                              padding: '12px',
                              borderRadius: '6px',
                              fontSize: '15px',
                              color: '#374151',
                              marginTop: '8px'
                            }}>
                              <strong>Interpretation:</strong> {result.interpretation}
                            </div>
                          )}

                          {result.reviewed_by && result.reviewed_at && (
                            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '8px' }}>
                              ✓ Reviewed by {result.reviewed_by} on {formatDate(result.reviewed_at)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.length > 0 && selectedTest !== test.id && (
                  <div style={{
                    marginTop: '16px',
                    fontSize: '14px',
                    color: '#3b82f6',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    Click to view {results.length} result{results.length !== 1 ? 's' : ''} ↓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
