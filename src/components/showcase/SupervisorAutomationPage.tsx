import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export const SupervisorAutomationPage: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error loading background jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'RUNNING': return '#3b82f6';
      case 'FAILED': return '#ef4444';
      case 'PENDING': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading automation status...</div>
      </div>
    );
  }

  const jobTypes = [...new Set(jobs.map(j => j.job_type))];
  const completedCount = jobs.filter(j => j.status === 'COMPLETED').length;
  const failedCount = jobs.filter(j => j.status === 'FAILED').length;
  const runningCount = jobs.filter(j => j.status === 'RUNNING').length;

  return (
    <div style={{
      maxWidth: '1200px',
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
          Automation & Background Jobs
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: 0
        }}>
          Monitor automated tasks and system processes
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
            Total Jobs
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#1a1a1a' }}>
            {jobs.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '2px solid #10b981',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '14px', color: '#10b981', marginBottom: '8px', fontWeight: '600' }}>
            Completed
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#10b981' }}>
            {completedCount}
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '14px', color: '#3b82f6', marginBottom: '8px', fontWeight: '600' }}>
            Running
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#3b82f6' }}>
            {runningCount}
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '14px', color: '#ef4444', marginBottom: '8px', fontWeight: '600' }}>
            Failed
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#ef4444' }}>
            {failedCount}
          </div>
        </div>
      </div>

      {/* Job Types Summary */}
      <div style={{
        background: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          color: '#1a1a1a'
        }}>
          Automated Job Types ({jobTypes.length})
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {jobTypes.map(type => (
            <span
              key={type}
              style={{
                background: '#f3f4f6',
                color: '#374151',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div style={{
        background: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 20px 0',
          color: '#1a1a1a'
        }}>
          Recent Background Jobs
        </h3>

        {jobs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            color: '#666'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚙️</div>
            <div style={{ fontSize: '16px' }}>No background jobs found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map(job => (
              <div
                key={job.id}
                style={{
                  border: '2px solid #e5e7eb',
                  borderLeft: `6px solid ${getStatusColor(job.status)}`,
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: '0 0 4px 0',
                      color: '#1a1a1a'
                    }}>
                      {job.job_type}
                    </h4>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Created: {formatDate(job.created_at)}
                    </div>
                  </div>
                  <span style={{
                    background: getStatusColor(job.status),
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {job.status}
                  </span>
                </div>

                {job.result_summary && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#374151'
                  }}>
                    <strong>Result:</strong> {job.result_summary}
                  </div>
                )}

                {job.error_message && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#fef2f2',
                    border: '2px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#991b1b'
                  }}>
                    <strong>Error:</strong> {job.error_message}
                  </div>
                )}

                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  gap: '16px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  {job.started_at && (
                    <div>
                      <strong>Started:</strong> {formatDate(job.started_at)}
                    </div>
                  )}
                  {job.completed_at && (
                    <div>
                      <strong>Completed:</strong> {formatDate(job.completed_at)}
                    </div>
                  )}
                  {job.attempts > 1 && (
                    <div>
                      <strong>Attempts:</strong> {job.attempts}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
