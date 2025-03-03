document.addEventListener('DOMContentLoaded', function() {
  const estadosOficiales = [
    "Aguascalientes",
    "Baja California",
    "Baja California Sur",
    "Campeche",
    "Chiapas",
    "Chihuahua",
    "Ciudad de Mexico",
    "Coahuila de Zaragoza",
    "Colima",
    "Durango",
    "Guanajuato",
    "Guerrero",
    "Hidalgo",
    "Jalisco",
    "Mexico",
    "Michoacan de Ocampo",
    "Morelos",
    "Nayarit",
    "Nuevo Leon",
    "Oaxaca",
    "Puebla",
    "Queretaro",
    "Quintana Roo",
    "San Luis Potosi",
    "Sinaloa",
    "Sonora",
    "Tabasco",
    "Tamaulipas",
    "Tlaxcala",
    "Veracruz de Ignacio de la Llave",
    "Yucatan",
    "Zacatecas"
  ];

  const stateSelect = document.getElementById('stateSelect');
  const mapFrame = document.getElementById('mapFrame');
  const areaRange = document.getElementById('areaRange');
  const areaValue = document.getElementById('areaValue');
  const applyFiltersBtn = document.getElementById('applyFilters');
  const filterPanel = document.getElementById("filterPanel");

  estadosOficiales.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  });

  stateSelect.value = "Tabasco";
  loadMapForState("Tabasco");

  stateSelect.addEventListener('change', function() {
    const selectedState = stateSelect.value;
    if (selectedState) {
      loadMapForState(selectedState);
    } else {
      mapFrame.src = "";
    }
  });

  function loadMapForState(selectedState) {
    const stateFileName = selectedState
      .replace(/ /g, '_')
      .replace(/ñ/g, 'n')
      .replace(/[áéíóúÁÉÍÓÚ]/g, match => {
        const mapChars = {
          'á':'a','é':'e','í':'i','ó':'o','ú':'u',
          'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U'
        };
        return mapChars[match];
      });
    const mapUrl = `maps/map_${stateFileName}.html`;
    mapFrame.src = mapUrl;
  }

  mapFrame.addEventListener('load', function() {
    try {
      const iframeWindow = mapFrame.contentWindow;
      if (!iframeWindow.showGraph) {
        iframeWindow.showGraph = window.showGraph;
      }
      if (iframeWindow.waterData && Array.isArray(iframeWindow.waterData) && iframeWindow.waterData.length > 0) {
        const areas = iframeWindow.waterData.map(item => item.area);
        const minArea = Math.min(...areas);
        const maxArea = Math.max(...areas);
        areaRange.min = minArea;
        areaRange.max = maxArea;
        areaRange.value = maxArea;
        areaValue.textContent = maxArea;
      } else {
        areaRange.min = 0;
        areaRange.max = 10000;
        areaRange.value = 10000;
        areaValue.textContent = 10000;
      }
    } catch (e) {
      console.error("Error accediendo al contenido del iframe:", e);
    }
  });

  areaRange.addEventListener('input', function() {
    areaValue.textContent = areaRange.value;
  });

  applyFiltersBtn.addEventListener('click', function() {
    const conditionFilters = [];
    if(document.getElementById('checkIntermitente').checked) {
      conditionFilters.push("INTERMITENTE");
    }
    if(document.getElementById('checkPerenne').checked) {
      conditionFilters.push("PERENNE");
    }
    const areaThreshold = parseFloat(areaRange.value);
    const iframeWindow = mapFrame.contentWindow;
    if(iframeWindow && typeof iframeWindow.applyMapFilters === 'function') {
      iframeWindow.applyMapFilters(conditionFilters, areaThreshold);
    } else {
      console.warn("La función applyMapFilters no está disponible en el iframe.");
    }
  });

  window.showGraph = function(water_id) {
    const csvUrl = `Resultados/CSV/${water_id}.csv`;
    fetch(csvUrl)
      .then(response => {
        if(!response.ok) {
          throw new Error('No se pudo cargar el archivo CSV.');
        }
        return response.text();
      })
      .then(csvText => {
        csvText = csvText.replace(/^\uFEFF/, '');

        const lines = csvText.trim().split('\n');
        const labels = [];
        const dataPoints = [];

        for(let i = 1; i < lines.length; i++){
          const parts = lines[i].split(',');
          if(parts.length >= 2) {
            labels.push(parts[0]);
            dataPoints.push(parseFloat(parts[1]));
          }
        }

        const chartCanvas = document.getElementById('waterChart');
        if(!chartCanvas) {
          console.error("No se encontró el elemento canvas con id='waterChart'");
          return;
        }

        const ctx = chartCanvas.getContext('2d');
        if(window.waterChart && typeof window.waterChart.destroy === "function") {
          window.waterChart.destroy();
        }

        window.waterChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Agua (ha)',
              data: dataPoints,
              fill: false,
              borderColor: 'blue',
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: {
              x: { title: { display: true, text: 'Fecha' } },
              y: { title: { display: true, text: 'Agua (ha)' } }
            }
          }
        });

        const graphModal = new bootstrap.Modal(document.getElementById('graphModal'));
        graphModal.show();
      })
      .catch(error => {
        console.error("Error al cargar o procesar el CSV:", error);
        alert("Error al cargar la gráfica.");
      });
  };

  window.toggleFilters = function() {
    if (filterPanel.style.display === "none" || filterPanel.style.display === "") {
      filterPanel.style.display = "block";
    } else {
      filterPanel.style.display = "none";
    }
  };
});
