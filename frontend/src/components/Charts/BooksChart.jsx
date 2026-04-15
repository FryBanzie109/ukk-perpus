import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function BooksChart({ isDark = false }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/books/trends/stock');
        const { booksIn, booksOut, totalStockByDay, last7Days } = res.data;

        setChartData({
          labels: last7Days.map(d => new Date(d).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })),
          datasets: [
            {
              type: 'bar',
              label: '📥 Buku Masuk',
              data: last7Days.map(day => booksIn[day] || 0),
              backgroundColor: 'rgba(75, 192, 75, 0.7)',
              borderColor: 'rgb(75, 192, 75)',
              borderWidth: 2,
              borderRadius: 4,
              fill: false
            },
            {
              type: 'bar',
              label: '📤 Buku Keluar',
              data: last7Days.map(day => booksOut[day] || 0),
              backgroundColor: 'rgba(255, 107, 107, 0.7)',
              borderColor: 'rgb(255, 107, 107)',
              borderWidth: 2,
              borderRadius: 4,
              fill: false
            },
            {
              type: 'line',
              label: '📊 Total Stok',
              data: last7Days.map(day => totalStockByDay[day] || 0),
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              borderWidth: 3,
              pointRadius: 5,
              pointBackgroundColor: 'rgb(54, 162, 235)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.4,
              fill: true,
              yAxisID: 'y1'
            }
          ]
        });
      } catch (err) {
        console.error('Error fetching books chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="text-center p-4">📊 Loading chart...</div>;
  if (!chartData) return <div className="text-center p-4">Tidak ada data</div>;

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#fff' : '#333',
          font: { size: 12, weight: 'bold' },
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: '📚 Manajemen Stok Buku (7 Hari Terakhir)',
        color: isDark ? '#fff' : '#333',
        font: { size: 14, weight: 'bold' },
        padding: 20
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: { color: isDark ? '#aaa' : '#666' },
        grid: { color: isDark ? '#444' : '#e9ecef' },
        title: {
          display: true,
          text: 'Jumlah Buku (Masuk/Keluar)',
          color: isDark ? '#aaa' : '#666'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        ticks: { color: 'rgb(54, 162, 235)' },
        grid: { drawOnChartArea: false },
        title: {
          display: true,
          text: 'Total Stok',
          color: 'rgb(54, 162, 235)'
        }
      },
      x: {
        ticks: { color: isDark ? '#aaa' : '#666' },
        grid: { color: isDark ? '#444' : '#e9ecef' }
      }
    }
  };

  return (
    <div className="card mb-4" style={{ backgroundColor: isDark ? '#2a2a2a' : '#fff', border: isDark ? '1px solid #444' : '1px solid #dee2e6' }}>
      <div className="card-body">
        <div className="mb-3">
          <h5 className="card-title mb-2" style={{ color: isDark ? '#fff' : '#333' }}>📚 Trend Buku</h5>
          <small className="text-muted">Visualisasi buku masuk, keluar, dan total stok</small>
        </div>
        <Line data={chartData} options={options} />
        <div className="row mt-4 text-muted small">
          <div className="col-md-4">
            <p><strong>📥 Buku Masuk:</strong> Penambahan buku ke stok</p>
          </div>
          <div className="col-md-4">
            <p><strong>📤 Buku Keluar:</strong> Pengurangan stok (hilang/rusak)</p>
          </div>
          <div className="col-md-4">
            <p><strong>📊 Total Buku:</strong> Total stok tersedia</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BooksChart;

