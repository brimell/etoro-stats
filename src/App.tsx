import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import styled from 'styled-components';

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
  max-width: 600px;
  width: 100%;
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
    <Container>
      <Title>eToro Statement Analysis</Title>
      <Card>
        <Paragraph>Please upload your Excel statement:</Paragraph>
        <FileInput type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        {error && <ErrorText>{error}</ErrorText>}
        {stats && (
          <div>
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
          </div>
        )}
      </Card>
    </Container>
  );
};

export default App;
