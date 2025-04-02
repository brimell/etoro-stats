import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import styled from 'styled-components';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Cell,
  LineChart,
} from 'recharts';

// Define interfaces for our chart data
interface DailyData {
  date: string;
  profit: number;
  cumulativeProfit: number;
  balance: number;
  dailyPercentChange: number;
}

interface MonthlyData {
  month: string;
  profit: number;
  cumulativeProfit: number;
  balance: number;
  monthlyPercentChange: number;
}

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
  dailyData: DailyData[];
  monthlyData: MonthlyData[];
}

// Styled components for layout
const Container = styled.div`
  min-height: 100vh;
  background-color: #f3f4f6;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  font-family: Arial, sans-serif;
`;

const Card = styled.div`
  background-color: #ffffff;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const Subtitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const Paragraph = styled.p`
  font-size: 1rem;
  margin-bottom: 1rem;
  color: #374151;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ListItem = styled.li`
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: #374151;
`;

const FileInput = styled.input`
  display: block;
  width: 100%;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem;
  margin-bottom: 1rem;
  color: #111827;
`;

const ErrorText = styled.p`
  color: #dc2626;
`;

const ChartContainer = styled.div`
  margin-top: 2rem;
`;

// Custom tooltip for daily chart
const CustomDailyTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: '10px' }}>
        <p>{`Date: ${label}`}</p>
        <p>
          {`Daily Profit: ${data.profit.toFixed(2)} USD (${data.dailyPercentChange.toFixed(2)}%)`}
        </p>
        <p>{`Cumulative Profit: ${data.cumulativeProfit.toFixed(2)} USD`}</p>
        <p>{`Balance: ${data.balance.toFixed(2)} USD`}</p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for monthly chart
const CustomMonthlyTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: '10px' }}>
        <p>{`Month: ${label}`}</p>
        <p>
          {`Monthly Profit: ${data.profit.toFixed(2)} USD (${data.monthlyPercentChange.toFixed(2)}%)`}
        </p>
        <p>{`Cumulative Profit: ${data.cumulativeProfit.toFixed(2)} USD`}</p>
        <p>{`Balance: ${data.balance.toFixed(2)} USD`}</p>
      </div>
    );
  }
  return null;
};

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

    // Assume an initial balance for computing balance and % changes
    const initialBalance = 10000;
    let cumulative = 0;
    let previousBalance = initialBalance;
    const dailyData: DailyData[] = Object.keys(dailyProfitMap).map((dateStr) => ({
      date: dateStr,
      profit: dailyProfitMap[dateStr],
      cumulativeProfit: 0, // will update below
      balance: 0,
      dailyPercentChange: 0,
    }));
    // Sort by date (assuming format yyyy-mm-dd)
    dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    dailyData.forEach((item) => {
      cumulative += item.profit;
      item.cumulativeProfit = cumulative;
      item.balance = initialBalance + cumulative;
      // Calculate daily percentage change relative to previous balance
      item.dailyPercentChange = previousBalance !== 0 ? (item.profit / previousBalance) * 100 : 0;
      previousBalance = item.balance;
    });

    // Compute monthly data by grouping dailyData
    const monthlyProfitMap: { [key: string]: number } = {};
    dailyData.forEach((item) => {
      const month = item.date.slice(0, 7); // yyyy-mm
      monthlyProfitMap[month] = (monthlyProfitMap[month] || 0) + item.profit;
    });
    // Create an array of months with profit
    const monthlyDataArray: { month: string; profit: number }[] = Object.keys(monthlyProfitMap).map(
      (month) => ({
        month,
        profit: monthlyProfitMap[month],
      })
    );
    monthlyDataArray.sort((a, b) => a.month.localeCompare(b.month));
    let monthlyCumulative = 0;
    let prevMonthlyBalance = initialBalance;
    const monthlyData: MonthlyData[] = [];
    monthlyDataArray.forEach((item) => {
      monthlyCumulative += item.profit;
      const balance = initialBalance + monthlyCumulative;
      const monthlyPercentChange = prevMonthlyBalance !== 0 ? (item.profit / prevMonthlyBalance) * 100 : 0;
      monthlyData.push({
        month: item.month,
        profit: item.profit,
        cumulativeProfit: monthlyCumulative,
        balance,
        monthlyPercentChange,
      });
      prevMonthlyBalance = balance;
    });

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
      dailyData,
      monthlyData,
    };
  };

  return (
    <Container>
      <Title>eToro Statement Analysis</Title>
      <Card>
        <Paragraph>Please upload your Excel statement:</Paragraph>
        <FileInput type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        {error && <ErrorText>{error}</ErrorText>}
        {stats && (
          <>
            <Subtitle>Trading Statistics</Subtitle>
            <List>
              <ListItem><strong>Total trades:</strong> {stats.totalTrades}</ListItem>
              <ListItem><strong>Profitable trades:</strong> {stats.profitableTrades}</ListItem>
              <ListItem><strong>Losing trades:</strong> {stats.lossTrades}</ListItem>
              <ListItem><strong>Break-even trades:</strong> {stats.breakEvenTrades}</ListItem>
              <ListItem><strong>Win rate:</strong> {stats.winRate.toFixed(2)}%</ListItem>
              <ListItem>
                <strong>Total profit (USD):</strong> ${stats.totalProfit.toFixed(2)}
              </ListItem>
              <ListItem>
                <strong>Maximum profit on single trade (USD):</strong> ${stats.maxProfit.toFixed(2)}
              </ListItem>
              <ListItem>
                <strong>Maximum loss on single trade (USD):</strong> ${stats.minProfit.toFixed(2)}
              </ListItem>
              <ListItem>
                <strong>Average profit per trade (USD):</strong> ${stats.avgProfit.toFixed(2)}
              </ListItem>
              <ListItem>
                <strong>Median profit per trade (USD):</strong> ${stats.medianProfit.toFixed(2)}
              </ListItem>
              <ListItem>
                <strong>Standard deviation of profit (USD):</strong> ${stats.stdDev.toFixed(2)}
              </ListItem>
              <ListItem>
                <strong>Average daily profit (USD):</strong> ${stats.averageDailyProfit.toFixed(2)}
              </ListItem>
              <ListItem>
                <strong>Projected yearly income (USD):</strong> ${stats.projectedAnnualIncome.toFixed(2)}
              </ListItem>
            </List>
          </>
        )}
      </Card>

      {stats && (
        <Card>
          <Subtitle>Interactive Graphs</Subtitle>

          {/* Chart 1: Cumulative Profit (Daily) */}
          <ChartContainer>
            <Paragraph><strong>Cumulative Profit</strong></Paragraph>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomDailyTooltip />} />
                <Legend />
                <Bar dataKey="profit" barSize={20} name="Daily Profit">
                  {stats.dailyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.profit >= 0 ? "#00c853" : "#d50000"}
                    />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="cumulativeProfit" stroke="#ff7300" name="Cumulative Profit" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Chart 2: Monthly Profit Breakdown */}
          <ChartContainer>
            <Paragraph><strong>Monthly Profit Breakdown</strong></Paragraph>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomMonthlyTooltip />} />
                <Legend />
                <Bar dataKey="profit" name="Monthly Profit">
                  {stats.monthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.profit >= 0 ? "#00c853" : "#d50000"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Chart 3: Account Balance Over Time */}
          <ChartContainer>
            <Paragraph><strong>Account Balance Over Time</strong></Paragraph>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomDailyTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="balance" stroke="#8884d8" name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      )}
    </Container>
  );
};

export default App;
