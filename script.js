let allBBS = [];

const countryCoords = {
    "USA": [37.09, -95.71], "Canada": [56.13, -106.35], "Germany": [51.17, 10.45],
    "UK": [55.38, -3.44], "England": [52.36, -1.17], "France": [46.60, 1.89],
    "Australia": [-25.27, 133.78], "Finland": [61.92, 25.75], "Sweden": [60.13, 18.64],
    "Italy": [41.87, 12.57], "Norway": [60.47, 8.47], "Japan": [36.20, 138.25],
    "Taiwan": [23.70, 120.96], "China": [35.86, 104.20], "Brazil": [-14.24, -51.93],
    "Russia": [61.52, 105.32], "Netherlands": [52.13, 5.29], "Unknown": [20, 0]
};

function loadData() {
    console.log("开始加载 CSV...");
    Papa.parse("data/bbs_clean.csv", {
        download: true,
        header: true,
        complete: function(results) {
            console.log("CSV 加载完成，行数:", results.data.length);
            allBBS = results.data;
            document.getElementById("totalCount").innerText = allBBS.length;
            populateFilters();
            renderTable();  // 直接渲染表格
            renderStats();
            renderMap();
        },
        error: function(err) {
            console.error("CSV 加载失败:", err);
        }
    });
}

// 渲染表格 - 这是最关键的函数
function renderTable() {
    console.log("renderTable 被调用，BBS 数量:", allBBS.length);
    
    // 获取表格 body
    let tbody = document.querySelector("#resultTable tbody");
    if (!tbody) {
        console.error("找不到表格 body！");
        return;
    }
    
    // 清空表格
    tbody.innerHTML = "";
    
    // 检查是否有数据
    if (allBBS.length === 0) {
        console.warn("没有数据可显示");
        return;
    }
    
    // 显示前 100 条数据
    let displayCount = Math.min(100, allBBS.length);
    console.log("准备显示", displayCount, "条数据");
    
    for (let i = 0; i < displayCount; i++) {
        let b = allBBS[i];
        let row = tbody.insertRow();
        
        // 直接使用 CSV 中的列名（注意大小写）
        row.insertCell(0).innerHTML = b.bbsName || "?";
        row.insertCell(1).innerHTML = b.software_clean || "?";
        row.insertCell(2).innerHTML = b.country || "?";
        row.insertCell(3).innerHTML = b.newLogin || "?";
        
        // Telnet 地址：如果有端口就显示 地址:端口，否则只显示地址
        let telnetAddr = b.TelnetAddress || "";
        let telnetPort = b.bbsPort ? ":" + b.bbsPort : "";
        row.insertCell(4).innerHTML = telnetAddr + telnetPort || "—";
    }
    
    console.log("表格渲染完成，共", displayCount, "行");
    document.getElementById("listCount").innerHTML = `(${allBBS.length} 条)`;
}

// 填充筛选下拉框
function populateFilters() {
    let softwares = [...new Set(allBBS.map(b => b.software_clean).filter(s => s && s !== "Unknown"))];
    softwares.sort();
    let swSelect = document.getElementById("softwareFilter");
    swSelect.innerHTML = '<option value="all">全部</option>';
    softwares.forEach(s => {
        swSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });
    
    let countries = [...new Set(allBBS.map(b => b.country).filter(c => c && c !== "" && c !== "Unknown"))];
    countries.sort();
    let countrySelect = document.getElementById("countryFilter");
    countrySelect.innerHTML = '<option value="all">全部</option>';
    countries.forEach(c => {
        countrySelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

// 渲染统计
function renderStats() {
    let swCount = {};
    allBBS.forEach(b => {
        let sw = b.software_clean || "未知";
        swCount[sw] = (swCount[sw] || 0) + 1;
    });
    let sortedSw = Object.entries(swCount).sort((a, b) => b[1] - a[1]);
    let html = `<p><strong>显示: ${allBBS.length} 个 BBS</strong></p>`;
    html += `<p><strong>软件分布 (前5):</strong></p><ul>`;
    sortedSw.slice(0, 5).forEach(([sw, cnt]) => {
        let pct = ((cnt / allBBS.length) * 100).toFixed(1);
        html += `<li>${sw}: ${cnt} (${pct}%)</li>`;
    });
    html += `</ul>`;
    
    let countryCount = {};
    allBBS.forEach(b => {
        let c = b.country || "未知";
        countryCount[c] = (countryCount[c] || 0) + 1;
    });
    let sortedCountry = Object.entries(countryCount).sort((a, b) => b[1] - a[1]);
    html += `<p><strong>国家分布 (前5):</strong></p><ul>`;
    sortedCountry.slice(0, 5).forEach(([c, cnt]) => {
        html += `<li>${c}: ${cnt}</li>`;
    });
    html += `</ul>`;
    
    document.getElementById("statsInfo").innerHTML = html;
}

// 渲染地图
function renderMap() {
    if (window.map) window.map.remove();
    let map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        subdomains: 'abcd'
    }).addTo(map);
    window.map = map;
    
    let countryBBS = {};
    allBBS.forEach(b => {
        let country = b.country;
        if (country && country !== "未知" && country !== "" && countryCoords[country]) {
            countryBBS[country] = (countryBBS[country] || 0) + 1;
        }
    });
    
    for (let [country, count] of Object.entries(countryBBS)) {
        let coords = countryCoords[country];
        if (coords) {
            let radius = Math.min(18, 5 + Math.sqrt(count) * 1.2);
            let color = count > 50 ? '#e63946' : (count > 20 ? '#f4a261' : '#2a9d8f');
            let circle = L.circleMarker(coords, {
                radius: radius,
                fillColor: color,
                color: '#fff',
                weight: 1.5,
                fillOpacity: 0.75
            }).addTo(map);
            circle.bindPopup(`<b>${country}</b><br>BBS 数量: ${count}`);
        }
    }
}

// 筛选功能
function filterData() {
    let sw = document.getElementById("softwareFilter").value;
    let country = document.getElementById("countryFilter").value;
    let newLogin = document.getElementById("newLoginFilter").value;
    
    let filtered = allBBS.filter(b => {
        if (sw !== "all" && b.software_clean !== sw) return false;
        if (country !== "all" && b.country !== country) return false;
        if (newLogin !== "all" && b.newLogin !== newLogin) return false;
        return true;
    });
    
    // 重新渲染表格
    let tbody = document.querySelector("#resultTable tbody");
    tbody.innerHTML = "";
    let displayCount = Math.min(100, filtered.length);
    for (let i = 0; i < displayCount; i++) {
        let b = filtered[i];
        let row = tbody.insertRow();
        row.insertCell(0).innerHTML = b.bbsName || "?";
        row.insertCell(1).innerHTML = b.software_clean || "?";
        row.insertCell(2).innerHTML = b.country || "?";
        row.insertCell(3).innerHTML = b.newLogin || "?";
        let telnetAddr = b.TelnetAddress || "";
        let telnetPort = b.bbsPort ? ":" + b.bbsPort : "";
        row.insertCell(4).innerHTML = telnetAddr + telnetPort || "—";
    }
    document.getElementById("listCount").innerHTML = `(${filtered.length} 条)`;
    document.getElementById("filterResult").innerHTML = `筛选结果: ${filtered.length} 个 BBS`;
}

// 重置筛选
function resetFilters() {
    document.getElementById("softwareFilter").value = "all";
    document.getElementById("countryFilter").value = "all";
    document.getElementById("newLoginFilter").value = "all";
    renderTable();
    document.getElementById("listCount").innerHTML = `(${allBBS.length} 条)`;
    document.getElementById("filterResult").innerHTML = `筛选结果: ${allBBS.length} 个 BBS`;
}

// 绑定事件
document.getElementById("softwareFilter").addEventListener("change", filterData);
document.getElementById("countryFilter").addEventListener("change", filterData);
document.getElementById("newLoginFilter").addEventListener("change", filterData);
document.getElementById("resetBtn").addEventListener("click", resetFilters);

// 启动
loadData();