/**
 * Incident Chart Component
 * Bar chart of incidents by hour/day
 */

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function IncidentChart() {
    // Sample data - in real app, fetch from API
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const data = {
        labels,
        datasets: [
            {
                label: 'Incidents',
                data: [12, 19, 8, 15, 12, 9, 6],
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
            },
        },
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Weekly Incidents</h3>
            </div>
            <div className="chart-container">
                <Bar options={options} data={data} />
            </div>
        </div>
    );
}

export default IncidentChart;
