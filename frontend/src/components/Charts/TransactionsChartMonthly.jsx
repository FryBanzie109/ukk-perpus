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

export function TransactionsChartMonthly({ isDark = false }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthInfo, setMonthInfo] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/transactions/trends/monthly');
        const { borrowed, returned, daysOfMonth, month } = res.data;

        setMonthInfo(month);
        setChartData({
          labels: daysOfMonth.map(d => {
            const dayNum = new Date(d).getDate();
            return dayNum;
          }),
          datasets: [
            {
              type: 'bar',
              label: '📤 Dipinjam',
              data: daysOfMonth.map(day => borrowed[day] || 0),
              backgroundColor: 'rgba(255, 107, 107, 0.7)',
              borderColor: 'rgb(255, 107, 107)',
              borderWidth: 2,
              borderRadius: 4,
              fill: false
            },
            {
              type: 'bar',
              label: '📥 Dikembalikan',
              data: daysOfMonth.map(day => returned[day] || 0),
              backgroundColor: 'rgba(75, 192, 75, 0.7)',
              borderColor: 'rgb(75, 192, 75)',
              borderWidth: 2,
              borderRadius: 4,
              fill: false
            }
          ]
        });
      } catch (err) {
        console.error('Error fetching monthly transactions chart data:', err);
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
        text: `📦 Tren Transaksi Dipinjam & Dikembalikan - Bulan ${monthInfo}`,
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
        grid: { color: isDark ? '#444' : '#e9ecef' },
        title: {
          display: true,
          text: 'Tanggal',
          color: isDark ? '#aaa' : '#666'
        }
      }
    }
  };

  return (
    <div className="card mb-4" style={{ backgroundColor: isDark ? '#2a2a2a' : '#fff', border: isDark ? '1px solid #444' : '1px solid #dee2e6' }}>
      <div className="card-body">
        <div className="mb-3">
          <h5 className="card-title mb-2" style={{ color: isDark ? '#fff' : '#333' }}>📦 Trend Transaksi (Bulanan)</h5>
          <small className="text-muted">Visualisasi peminjaman dan pengembalian buku untuk bulan ini</small>
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

export default TransactionsChartMonthly;
