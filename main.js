const API_KEY = 'cdef745ca2ca42169f4203300252402'; 
const BASE_URL = 'https://api.weatherapi.com/v1';

let abortController = null;
const timeoutDuration = 8000; 
let requestHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if(searchBtn) searchBtn.addEventListener('click', fetchWeatherData);
    if(cancelBtn) cancelBtn.addEventListener('click', cancelFetch);
});

async function fetchWeatherData() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) {
        showError('Пожалуйста, введите название города');
        return;
    }
    
    try {
        if (abortController) {
            abortController.abort();
        }
        
        abortController = new AbortController();
        const signal = abortController.signal;
        
        showLoading(true);
        hideError();
        hideWeatherData();
        
        const timeoutId = setTimeout(() => {
            abortController.abort();
            showError('Превышено время ожидания ответа от сервера');
        }, timeoutDuration);
        
        const currentUrl = `${BASE_URL}/current.json?key=${API_KEY}&q=${city}&lang=ru`;
        const currentResponse = await fetch(currentUrl, { signal });
        
        const forecastUrl = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${city}&days=7&lang=ru`;//Какая то проблема с сервисом, не получается получить больше 3 дней
        const forecastResponse = await fetch(forecastUrl, { signal });
        
        clearTimeout(timeoutId);
        
        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('Не удалось получить данные о погоде');
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        displayWeatherData(currentData, forecastData);
        addToHistory(city, currentData);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error:', error);
            showError(getErrorMessage(error));
        }
    } finally {
        showLoading(false);
        abortController = null;
    }
}

function cancelFetch() {
    if (abortController) {
        abortController.abort();
        showLoading(false);
        showError('Запрос отменен пользователем');
        abortController = null;
    }
}

function displayWeatherData(currentData, forecastData) {
    const currentWeather = document.getElementById('currentWeather');
    document.getElementById('cityName').textContent = `${currentData.location.name}, ${currentData.location.country}`;
    document.getElementById('temperature').textContent = currentData.current.temp_c;
    document.getElementById('humidity').textContent = currentData.current.humidity;
    document.getElementById('currentWeatherIcon').src = `https:${currentData.current.condition.icon}`;
    currentWeather.style.display = 'block';
    
    const forecastList = document.getElementById('forecastList');
    forecastList.innerHTML = '';
    
    forecastData.forecast.forecastday.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'forecast-day';
        
        const date = new Date(day.date);
        const dateStr = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
        
        dayElement.innerHTML = `
            <p><strong>${dateStr}</strong></p>
            <p>${day.day.avgtemp_c}°C</p>
            <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}" width="30">
            <p>${day.day.condition.text}</p>
        `;
        
        forecastList.appendChild(dayElement);
    });
    
    document.getElementById('forecast').style.display = 'block';
}

function addToHistory(city, currentData) {
    const historyItem = {
        city: city,
        temp: currentData.current.temp_c,
        icon: currentData.current.condition.icon,
        date: new Date().toLocaleString('ru-RU')
    };
    
    requestHistory.unshift(historyItem); 
    if (requestHistory.length > 5) {
        requestHistory = requestHistory.slice(0, 5); 
    }
    
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    requestHistory.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'history-item';
        itemElement.innerHTML = `
            <span>${item.city}</span>
            <span>${item.temp}°C</span>
            <img src="https:${item.icon}" alt="icon" width="20">
        `;
        historyList.appendChild(itemElement);
    });
    
    document.getElementById('history').style.display = 'block';
}

function showLoading(show) {
    const loader = document.getElementById('loader');
    loader.style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function hideWeatherData() {
    document.getElementById('currentWeather').style.display = 'none';
    document.getElementById('forecast').style.display = 'none';
}

function getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
        return 'Ошибка соединения с интернетом';
    } else if (error.message.includes('404')) {
        return 'Город не найден';
    } else {
        return error.message || 'Произошла ошибка при получении данных';
    }
}
