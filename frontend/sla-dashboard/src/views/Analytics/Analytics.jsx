/**
 * Analytics Page
 */

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

function Analytics() {
    const severityData = {
        labels: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'],
        datasets: [{
            data: [45, 80, 120, 60, 25],
            backgroundColor: [
                'rgba(16, 185, 129, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 0, 0, 0.8)',
            ],
        }],
    };

    const monthlyTrendData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'Incidents',
            data: [65, 78, 90, 81, 86, 95, 88, 102, 98, 89, 85, 79],
            borderColor: 'rgba(37, 99, 235, 1)',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3,
        }],
    };

    const responseTimeData = {
        labels: ['<5min', '5-10min', '10-20min', '20-30min', '>30min'],
        datasets: [{
            label: 'Response Time Distribution',
            data: [45, 30, 15, 7, 3],
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 4,
        }],
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Analytics</h1>
                    <p className="page-subtitle">State-wide incident analytics and insights</p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Monthly Incident Trend</h3>
                        </div>
                        <div className="chart-container">
                            <Line data={monthlyTrendData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>

                <div className="dashboard-col-6">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Severity Distribution</h3>
                        </div>
                        <div className="chart-container" style={{ maxWidth: 300, margin: '0 auto' }}>
                            <Doughnut data={severityData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>

                <div className="dashboard-col-12">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Response Time Analysis</h3>
                        </div>
                        <div className="chart-container">
                            <Bar data={responseTimeData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Analytics;
