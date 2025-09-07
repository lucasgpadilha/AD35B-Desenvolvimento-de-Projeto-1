document.addEventListener('DOMContentLoaded', () => {
    const clientSelector = document.getElementById('clientSelector');
    const chartsContainer = document.getElementById('charts-container');
    
    let signalChart, speedChart, interferenceChart;

    // --- NOVA FUNÇÃO ---
    // Converte valores dBm para uma escala de qualidade de 0 a 100.
    // -30 dBm é considerado 100% de qualidade.
    // -90 dBm é considerado 0% de qualidade.
    const normalizeDbmToQuality = (dbm, minDbm = -90, maxDbm = -30) => {
      if (dbm >= maxDbm) return 100;
      if (dbm <= minDbm) return 0;
      
      const percentage = ((dbm - minDbm) / (maxDbm - minDbm)) * 100;
      return percentage;
    };

    // Função para criar ou atualizar os gráficos
    const createOrUpdateChart = (chartInstance, canvasId, chartConfig) => {
        if (chartInstance) {
            chartInstance.destroy();
        }
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, chartConfig);
    };
    
    const updateDashboard = async (clientId) => {
        if (!clientId) return;

        try {
            const response = await fetch(`/api/dashboard/client/${clientId}`);
            const data = await response.json();

            if (data.length === 0) {
                chartsContainer.classList.add('d-none');
                alert('Nenhuma medição encontrada para os locais deste cliente.');
                return;
            }
            
            chartsContainer.classList.remove('d-none');

            const locationLabels = data.map(d => d.locationName);

            // --- ALTERAÇÃO AQUI: Normalizar os dados de sinal e interferência ---
            const normalizedSignal24 = data.map(d => normalizeDbmToQuality(d.avg_signal_2_4));
            const normalizedSignal5 = data.map(d => normalizeDbmToQuality(d.avg_signal_5));
            // Para interferência, um valor mais baixo é melhor, então invertemos a lógica.
            // -95 dBm (ótimo, sem interferência) será perto de 100%.
            // -20 dBm (péssimo, muita interferência) será perto de 0%.
            const normalizedInterference = data.map(d => normalizeDbmToQuality(d.avg_interference, -95, -20));

            // Armazenar os dados originais para usar nos tooltips (dicas de hover)
            const originalSignalData = data.map(d => ({ s24: d.avg_signal_2_4, s5: d.avg_signal_5 }));
            const originalInterferenceData = data.map(d => d.avg_interference);

            // Gráfico de Sinal (agora como "Qualidade do Sinal")
            signalChart = createOrUpdateChart(signalChart, 'signalChart', {
                type: 'bar',
                data: {
                    labels: locationLabels,
                    datasets: [
                        { label: 'Qualidade 2.4GHz', data: normalizedSignal24, backgroundColor: 'rgba(54, 162, 235, 0.7)' },
                        { label: 'Qualidade 5GHz', data: normalizedSignal5, backgroundColor: 'rgba(255, 99, 132, 0.7)' }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                // Mostra o valor original em dBm ao passar o mouse
                                label: function(context) {
                                    const datasetIndex = context.datasetIndex;
                                    const dataIndex = context.dataIndex;
                                    const originalValue = datasetIndex === 0 ? originalSignalData[dataIndex].s24 : originalSignalData[dataIndex].s5;
                                    return `${context.dataset.label}: ${originalValue.toFixed(2)} dBm (${context.parsed.y.toFixed(0)}%)`;
                                }
                            }
                        }
                    },
                    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` } } }
                }
            });
            
            // Gráfico de Velocidade (sem alteração na lógica)
            speedChart = createOrUpdateChart(speedChart, 'speedChart', {
                type: 'bar',
                data: {
                    labels: locationLabels,
                    datasets: [
                        { label: 'Velocidade 2.4GHz', data: data.map(d => d.avg_speed_2_4), backgroundColor: 'rgba(255, 159, 64, 0.7)' },
                        { label: 'Velocidade 5GHz', data: data.map(d => d.avg_speed_5), backgroundColor: 'rgba(153, 102, 255, 0.7)' }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { callback: (value) => `${value} Mbps` } } }
                }
            });

            // Gráfico de Interferência (agora como "Qualidade (Ausência de Interf.)")
            interferenceChart = createOrUpdateChart(interferenceChart, 'interferenceChart', {
                type: 'bar',
                data: {
                    labels: locationLabels,
                    datasets: [
                        { label: 'Qualidade (Ausência de Interf.)', data: normalizedInterference, backgroundColor: 'rgba(75, 192, 192, 0.7)' }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                // Mostra o valor original em dBm ao passar o mouse
                                label: function(context) {
                                    const originalValue = originalInterferenceData[context.dataIndex];
                                    return `Interferência: ${originalValue.toFixed(2)} dBm (${context.parsed.y.toFixed(0)}%)`;
                                }
                            }
                        }
                    },
                    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` } } }
                }
            });

        } catch (error) {
            console.error('Erro ao buscar dados para o dashboard:', error);
        }
    };

    clientSelector.addEventListener('change', (event) => {
        updateDashboard(event.target.value);
    });
});