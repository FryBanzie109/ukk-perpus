import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

export function TransactionHistoryChart({ isDark = false }) {
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

        // Count cumulative and track borrowed/returned
        const cumulativeCount = {};
        const borrowedCount = {};
        const returnedCount = {};
        let totalBorrowedSoFar = 0;
        let totalReturnedSoFar = 0;

        last7Days.forEach(day => {
          borrowedCount[day] = 0;
          returnedCount[day] = 0;
        });

        transactions.forEach(trans => {
          if (trans.tanggal_pinjam) {
            const borrowDate = new Date(trans.tanggal_pinjam).toISOString().split('T')[0];
            if (borrowedCount[borrowDate] !== undefined) {
              borrowedCount[borrowDate]++;
            }
          }
          if (trans.tanggal_kembali) {
            const returnDate = new Date(trans.tanggal_kembali).toISOString().split('T')[0];
            if (returnedCount[returnDate] !== undefined) {
              returnedCount[returnDate]++;
            }
          }
        });

        last7Days.forEach(day => {
          totalBorrowedSoFar += borrowedCount[day];
          totalReturnedSoFar += returnedCount[day];
          cumulativeCount[day] = totalBorrowedSoFar - totalReturnedSoFar;
        });

        // Calculate late returns
        const lateReturns = transactions.filter(trans => {
          if (trans.tanggal_kembali && trans.tanggal_seharusnya_dikembalikan) {
            return new Date(trans.tanggal_kembali) > new Date(trans.tanggal_seharusnya_dikembalikan);
          }
          return false;
        }).length;

        setChartData({
          labels: last7Days.map(d => new Date(d).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })),
          datasets: [
            {
              label: '📤 Kumulatif Dipinjam',
              data: last7Days.map(day => {
                let totalBorrowed = 0;
                let tempBorrowed = 0;
                for (let i = 0; i <= last7Days.indexOf(day); i++) {
                  tempBorrowed += borrowedCount[last7Days[i]];
                }
                return tempBorrowed;
              }),
              borderColor: 'rgb(255, 107, 107)',
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: 'rgb(255, 107, 107)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: '📥 Kumulatif Dikembalikan',
              data: last7Days.map(day => {
                let totalReturned = 0;
                for (let i = 0; i <= last7Days.indexOf(day); i++) {
                  totalReturned += returnedCount[last7Days[i]];
                }
                return totalReturned;
              }),
              borderColor: 'rgb(75, 192, 75)',
              backgroundColor: 'rgba(75, 192, 75, 0.1)',
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: 'rgb(75, 192, 75)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: '⚠️ Masih Dipinjam',
              data: last7Days.map(day => cumulativeCount[day] || 0),
              borderColor: 'rgb(255, 193, 7)',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              borderWidth: 3,
              pointRadius: 5,
              pointBackgroundColor: 'rgb(255, 193, 7)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.4,
              fill: true,
              borderDash: [5, 5]
            }
          ],
          summary: {
            total: transactions.length,
            borrowed: Math.max(...Object.values(borrowedCount).reduce((acc, val) => acc + val, 0), 0),
            returned: transactions.filter(t => t.tanggal_kembali).length,
            lateReturns
          }
        });
      } catch (err) {
        console.error('Error fetching transaction history chart data:', err);
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
        text: '📈 Riwayat Kumulatif Transaksi (7 Hari Terakhir)',
        color: isDark ? '#fff' : '#333',
        font: { size: 14, weight: 'bold' },
        padding: 20
      }
    },
    scales: {
      y: {
        ticks: { color: isDark ? '#aaa' : '#666' },
        grid: { color: isDark ? '#444' : '#e9ecef' },
        title: {
          display: true,
          text: 'Jumlah Kumulatif',
          color: isDark ? '#aaa' : '#666'
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
          <h5 className="card-title mb-2" style={{ color: isDark ? '#fff' : '#333' }}>📈 Riwayat Kumulatif</h5>
          <small className="text-muted">Visualisasi tren kumulatif peminjaman dan pengembalian buku</small>
        </div>
        <Line data={chartData} options={options} />
        
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="p-3 rounded" style={{ backgroundColor: isDark ? '#333' : '#f8f9fa' }}>
              <p className="text-muted mb-1" style={{ fontSize: '12px' }}>Total Transaksi</p>
              <h6 style={{ color: isDark ? '#6c63ff' : '#0d6efd', marginBottom: 0 }}>{chartData.summary.total}</h6>
            </div>
          </div>
          <div className="col-md-3">
            <div className="p-3 rounded" style={{ backgroundColor: isDark ? '#333' : '#f8f9fa' }}>
              <p className="text-muted mb-1" style={{ fontSize: '12px' }}>Sudah Dikembalikan</p>
              <h6 style={{ color: '#28a745', marginBottom: 0 }}>{chartData.summary.returned}</h6>
            </div>
          </div>
          <div className="col-md-3">
            <div className="p-3 rounded" style={{ backgroundColor: isDark ? '#333' : '#f8f9fa' }}>
              <p className="text-muted mb-1" style={{ fontSize: '12px' }}>Masih Dipinjam</p>
              <h6 style={{ color: '#ffc107', marginBottom: 0 }}>{chartData.summary.total - chartData.summary.returned}</h6>
            </div>
          </div>
          <div className="col-md-3">
            <div className="p-3 rounded" style={{ backgroundColor: isDark ? '#333' : '#f8f9fa' }}>
              <p className="text-muted mb-1" style={{ fontSize: '12px' }}>Terlambat</p>
              <h6 style={{ color: '#dc3545', marginBottom: 0 }}>{chartData.summary.lateReturns}</h6>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionHistoryChart;
