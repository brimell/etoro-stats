import React, { useState } from 'react';
import * as XLSX from 'xlsx';

interface Stats {
  totalTrades: number;
  profitableTrades: number;
  lossTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalProfit: number;
  maxProfit: number;
  minProfit: number;
  avgProfit: number;
  medianProfit: number;
  stdDev: number;
  averageDailyProfit: number;
  projectedAnnualIncome: number;
}

const App: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        if (data) {
          try {
            // Read the Excel file as an array
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = 'Closed Positions';
            if (!workbook.Sheets[sheetName]) {
              setError(`Sheet "${sheetName}" not found in the uploaded file.`);
              return;
            }
            const worksheet = workbook.Sheets[sheetName];
            // Convert the worksheet data to JSON
            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
            const computedStats = computeStats(jsonData);
            setStats(computedStats);
            setError('');
          } catch (err) {
            setError('Error processing file.');
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const computeStats = (trades: any[]): Stats => {
    // Filter out trades with missing or invalid profit values.
    const validTrades = trades.filter(
      (trade) =>
        trade['Profit(USD)'] !== '' && !isNaN(Number(trade['Profit(USD)']))
    );
    const totalTrades = validTrades.length;
    const profitArray = validTrades.map((trade) => Number(trade['Profit(USD)']));
    const profitableTrades = profitArray.filter((profit) => profit > 0).length;
    const lossTrades = profitArray.filter((profit) => profit < 0).length;
    const breakEvenTrades = profitArray.filter((profit) => profit === 0).length;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    const totalProfit = profitArray.reduce((acc, val) => acc + val, 0);
    const maxProfit = Math.max(...profitArray);
    const minProfit = Math.min(...profitArray);
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;

    // Compute median profit
    const sortedProfit = [...profitArray].sort((a, b) => a - b);
    let medianProfit = 0;
    if (sortedProfit.length > 0) {
      const mid = Math.floor(sortedProfit.length / 2);
      medianProfit =
        sortedProfit.length % 2 === 0
          ? (sortedProfit[mid - 1] + sortedProfit[mid]) / 2
          : sortedProfit[mid];
    }

    // Compute standard deviation
    const variance =
      totalTrades > 0
        ? profitArray.reduce((acc, val) => acc + Math.pow(val - avgProfit, 2), 0) /
          totalTrades
        : 0;
    const stdDev = Math.sqrt(variance);

    // Calculate daily profits by grouping trades by the 'Close Date'
    const dailyProfitMap: { [key: string]: number } = {};
    validTrades.forEach((trade) => {
      let dateStr = '';
      if (trade['Close Date']) {
        // Assume the date format is "dd/mm/yyyy hh:mm:ss"
        const parts = trade['Close Date'].toString().split(' ');
        if (parts.length > 0) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            // Rearrange dd/mm/yyyy to yyyy-mm-dd
            dateStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          } else {
            dateStr = parts[0];
          }
        }
      }
      if (dateStr) {
        dailyProfitMap[dateStr] = (dailyProfitMap[dateStr] || 0) + Number(trade['Profit(USD)']);
      }
    });
    const dailyProfits = Object.values(dailyProfitMap);
    const averageDailyProfit =
      dailyProfits.length > 0
        ? dailyProfits.reduce((acc, val) => acc + val, 0) / dailyProfits.length
        : 0;
    const projectedAnnualIncome = averageDailyProfit * 365;

    return {
      totalTrades,
      profitableTrades,
      lossTrades,
      breakEvenTrades,
      winRate,
      totalProfit,
      maxProfit,
      minProfit,
      avgProfit,
      medianProfit,
      stdDev,
      averageDailyProfit,
      projectedAnnualIncome,
    };
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>eToro Statement Analysis</h1>
      <p>Please upload your Excel statement:</p>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {stats && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Trading Statistics</h2>
          <ul>
            <li>
              <strong>Total trades:</strong> {stats.totalTrades}
            </li>
            <li>
              <strong>Profitable trades:</strong> {stats.profitableTrades}
            </li>
            <li>
              <strong>Losing trades:</strong> {stats.lossTrades}
            </li>
            <li>
              <strong>Break-even trades:</strong> {stats.breakEvenTrades}
            </li>
            <li>
              <strong>Win rate:</strong> {stats.winRate.toFixed(2)}%
            </li>
            <li>
              <strong>Total profit (USD):</strong> ${stats.totalProfit.toFixed(2)}
            </li>
            <li>
              <strong>Maximum profit on single trade (USD):</strong> ${stats.maxProfit.toFixed(2)}
            </li>
            <li>
              <strong>Maximum loss on single trade (USD):</strong> ${stats.minProfit.toFixed(2)}
            </li>
            <li>
              <strong>Average profit per trade (USD):</strong> ${stats.avgProfit.toFixed(2)}
            </li>
            <li>
              <strong>Median profit per trade (USD):</strong> ${stats.medianProfit.toFixed(2)}
            </li>
            <li>
              <strong>Standard deviation of profit (USD):</strong> ${stats.stdDev.toFixed(2)}
            </li>
            <li>
              <strong>Average daily profit (USD):</strong> ${stats.averageDailyProfit.toFixed(2)}
            </li>
            <li>
              <strong>Projected yearly income (USD):</strong> ${stats.projectedAnnualIncome.toFixed(2)}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
