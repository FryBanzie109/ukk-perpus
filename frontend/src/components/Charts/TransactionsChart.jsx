import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export function TransactionsChart({ isDark = false }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/transactions');
        const transactions = res.data;

        // Get last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          last7Days.push(date.toISOString().split('T')[0]);
        }

        // Count transactions by day
        const borrowed = {};
        const returned = {};

        last7Days.forEach(day => {
          borrowed[day] = 0;
          returned[day] = 0;
        });

        transactions.forEach(trans => {
          // Count borrowed
          if (trans.tanggal_pinjam) {
            const borrowDate = new Date(trans.tanggal_pinjam).toISOString().split('T')[0];
            if (borrowed[borrowDate] !== undefined) {
              borrowed[borrowDate]++;
            }
          }
          // Count returned
          if (trans.tanggal_kembali) {
            const returnDate = new Date(trans.tanggal_kembali).toISOString().split('T')[0];
            if (returned[returnDate] !== undefined) {
              returned[returnDate]++;
            }
          }
        });

        setChartData({
          labels: last7Days.map(d => new Date(d).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })),
          datasets: [
            {
              type: 'bar',
              label: '📤 Dipinjam',
              data: last7Days.map(day => borrowed[day] || 0),
              backgroundColor: 'rgba(255, 107, 107, 0.7)',
              borderColor: 'rgb(255, 107, 107)',
              borderWidth: 2,
              borderRadius: 4,
              fill: false
            },
            {
              type: 'bar',
              label: '📥 Dikembalikan',
              data: last7Days.map(day => returned[day] || 0),
              backgroundColor: 'rgba(75, 192, 75, 0.7)',
              borderColor: 'rgb(75, 192, 75)',
              borderWidth: 2,
              borderRadius: 4,
              fill: false
            },

          ]
        });
      } catch (err) {
        console.error('Error fetching transactions chart data:', err);
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
        text: '📦 Tren Transaksi Dipinjam & Dikembalikan (7 Hari Terakhir)',
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
          text: 'Jumlah Transaksi Dipinjam/Dikembalikan',
          color: isDark ? '#aaa' : '#666'
        }
      },
      y1: {
        type: 'linear',
        display: false,
        position: 'right',
        ticks: { color: 'rgb(54, 162, 235)' },
        grid: { drawOnChartArea: false },
        title: {
          display: false,
          text: 'Total Transaksi Harian',
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
          <h5 className="card-title mb-2" style={{ color: isDark ? '#fff' : '#333' }}>📦 Trend Transaksi</h5>
          <small className="text-muted">Visualisasi peminjaman dan pengembalian buku harian</small>
        </div>
        <Line data={chartData} options={options} />
        <div className="row mt-4 text-muted small">
          <div className="col-md-4">
            <p><strong>📤 Dipinjam:</strong> Buku yang dipinjam siswa</p>
          </div>
          <div className="col-md-4">
            <p><strong>📥 Dikembalikan:</strong> Buku yang dikembalikan siswa</p>
          </div>
          <div className="col-md-4">
            <p><strong>📊 Total Transaksi:</strong> Total transaksi dalam hari</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionsChart;
