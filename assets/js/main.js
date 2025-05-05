// State management
let appState = {
    originalData: [],
    filteredData: [],
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 0,
    kelasOptions: [],
    laporanOptions: [],
    groupData: {},
  };

  // DOM Elements
  const fileInput = document.getElementById("fileInput");
  const fileName = document.getElementById("fileName");
  const processFileBtn = document.getElementById("processFileBtn");
  const dataTable = document.getElementById("dataTable");
  const searchInput = document.getElementById("searchInput");
  const filterKelas = document.getElementById("filterKelas");
  const filterLaporan = document.getElementById("filterLaporan");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const paginationText = document.getElementById("pagination");
  const currentCountText = document.getElementById("currentCount");
  const totalCountText = document.getElementById("totalCount");
  const settingsBtn = document.getElementById("settingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const itemsPerPageSelect = document.getElementById("itemsPerPage");
  const darkModeToggle = document.getElementById("darkMode");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const lastUpdateTime = document.getElementById("lastUpdateTime");
  const refreshBtn = document.getElementById("refreshBtn");
  const groupSummary = document.getElementById("groupSummary");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const importJsonBtn = document.getElementById("importJsonBtn");
  const jsonFileInput = document.getElementById("jsonFileInput");

  // Stats elements
  const totalStudentsEl = document.getElementById("totalStudents");
  const submittedCountEl = document.getElementById("submittedCount");
  const gradedCountEl = document.getElementById("gradedCount");
  const groupCountEl = document.getElementById("groupCount");

  // File Input Accepted Formats
  fileInput.accept = ".csv, .xlsx, .xls, .json";

  // Event Listeners
  document.addEventListener("DOMContentLoaded", function () {
    // Initialize settings from localStorage if available
    initializeSettings();

    // Check for saved data
    loadSavedData();
  });

  fileInput.addEventListener("change", handleFileSelect);
  processFileBtn.addEventListener("click", processFile);
  searchInput.addEventListener("input", filterData);
  filterKelas.addEventListener("change", filterData);
  filterLaporan.addEventListener("change", filterData);
  prevPageBtn.addEventListener("click", goToPrevPage);
  nextPageBtn.addEventListener("click", goToNextPage);
  settingsBtn.addEventListener("click", openSettingsModal);
  closeSettingsBtn.addEventListener("click", closeSettingsModal);
  saveSettingsBtn.addEventListener("click", saveSettings);
  refreshBtn.addEventListener("click", refreshData);
  exportJsonBtn.addEventListener("click", function () {
    if (appState.originalData.length > 0) {
      exportToJsonFile(appState.originalData);
    } else {
      alert(
        "Tidak ada data yang bisa diekspor. Silakan unggah file data terlebih dahulu."
      );
    }
  });

  importJsonBtn.addEventListener("click", function () {
    jsonFileInput.click();
  });

  jsonFileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      showLoading();
      importFromJsonFile(file)
        .then((data) => {
          appState.originalData = data;

          // Extract kelas options
          const kelasSet = new Set();
          data.forEach((item) => {
            if (item.kelas) {
              kelasSet.add(item.kelas);
            }
          });
          appState.kelasOptions = Array.from(kelasSet).sort();

          // Extract laporan options
          const laporanSet = new Set();
          data.forEach((item) => {
            if (item.laporan) {
              laporanSet.add(item.laporan);
            }
          });
          appState.laporanOptions = Array.from(laporanSet).sort();

          // Update filters
          updateKelasFilter();
          updateLaporanFilter();

          // Process group data
          processGroupData();

          // Update stats
          updateStats();

          // Filter and render data
          filterData();

          // Update last update time
          const lastUpdateStr = new Date().toLocaleString("id-ID");
          lastUpdateTime.textContent = lastUpdateStr;
          localStorage.setItem("lastUpdate", lastUpdateStr);

          // Save to localStorage for backward compatibility
          localStorage.setItem("dashboardData", JSON.stringify(data));

          hideLoading();
          alert("Data berhasil diimpor dari file JSON!");
        })
        .catch((error) => {
          hideLoading();
          alert("Error: " + error.message);
        });
    }
  });

  // Event handler for settings modal close when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });

  // File handling functions
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      fileName.textContent = file.name;
      processFileBtn.disabled = false;
    }
  }

  function processFile() {
    const file = fileInput.files[0];
    if (!file) return;

    showLoading();

    setTimeout(() => {
      const fileReader = new FileReader();

      fileReader.onload = function (event) {
        const data = event.target.result;

        try {
          let parsedData;

          if (file.name.endsWith(".json")) {
            // Jika file adalah JSON
            parsedData = JSON.parse(data);
            processData(parsedData);
          } else if (file.name.endsWith(".csv")) {
            // Jika file adalah CSV
            parsedData = parseCSV(data);
            processData(parsedData);
            // Simpan data sebagai JSON setelah diproses
            exportToJsonFile(appState.originalData);
          } else if (
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls")
          ) {
            // Jika file adalah Excel
            parsedData = parseExcel(data);
            processData(parsedData);
            // Simpan data sebagai JSON setelah diproses
            exportToJsonFile(appState.originalData);
          } else {
            alert(
              "Format file tidak didukung. Silakan gunakan file CSV, Excel, atau JSON."
            );
            hideLoading();
            return;
          }

          hideLoading();

          // Simpan juga ke localStorage untuk backward compatibility
          localStorage.setItem(
            "dashboardData",
            JSON.stringify(appState.originalData)
          );
          localStorage.setItem(
            "lastUpdate",
            new Date().toLocaleString("id-ID")
          );
          lastUpdateTime.textContent = new Date().toLocaleString("id-ID");
        } catch (error) {
          console.error("Error processing file:", error);
          alert(
            "Terjadi kesalahan saat memproses file. Pastikan format file sesuai."
          );
          hideLoading();
        }
      };

      if (file.name.endsWith(".json") || file.name.endsWith(".csv")) {
        fileReader.readAsText(file);
      } else {
        fileReader.readAsArrayBuffer(file);
      }
    }, 500);
  }

  function parseCSV(data) {
    const results = Papa.parse(data, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    return results.data;
  }

  function parseExcel(data) {
    const arrayBuffer = data;
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    return XLSX.utils.sheet_to_json(worksheet, { raw: false });
  }

  function processData(data) {
    const transformedData = data.map((item, index) => {
      const cleanedItem = {};
      Object.keys(item).forEach((key) => {
        const cleanKey = key
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "_");
        cleanedItem[cleanKey] = item[key];
      });

      // Handle different column name possibilities
      const id = cleanedItem.id || cleanedItem.no || index + 1;
      const name = cleanedItem.name || cleanedItem.nama || "";
      const kelas = cleanedItem.kelas || cleanedItem.class || "";
      const kelompok =
        cleanedItem["list_anggota_kelompok_(nama_+_nim)"] ||
        cleanedItem.list_anggota_kelompok ||
        cleanedItem.kelompok ||
        "";
      const startTime =
        cleanedItem.start_time || cleanedItem.waktu_mulai || "";
      const endTime =
        cleanedItem.completion_time || cleanedItem.waktu_selesai || "";
      const email = cleanedItem.email || "";
      const laporan = cleanedItem.laporan_ke_ || cleanedItem.laporan || "";
      const laporanPraktikum =
        cleanedItem.laporan_praktikum || cleanedItem.link || "";

      return {
        id,
        name,
        kelas,
        kelompok,
        startTime,
        endTime,
        email,
        laporan,
        laporanPraktikum,
        status: endTime ? "Selesai" : "Belum Selesai",
      };
    });

    appState.originalData = transformedData;

    // Extract kelas options
    const kelasSet = new Set();
    transformedData.forEach((item) => {
      if (item.kelas) {
        kelasSet.add(item.kelas);
      }
    });

    appState.kelasOptions = Array.from(kelasSet).sort();

    // Extract laporan options
    const laporanSet = new Set();
    transformedData.forEach((item) => {
      if (item.laporan) {
        laporanSet.add(item.laporan);
      }
    });

    appState.laporanOptions = Array.from(laporanSet).sort();

    // Update kelas filter options
    updateKelasFilter();

    // Update laporan filter options
    updateLaporanFilter();

    // Process group data
    processGroupData();

    // Update stats
    updateStats();

    // Filter and render data
    filterData();
  }

  function processGroupData() {
    // Reset group data
    appState.groupData = {};

    // Group students by their kelompok
    appState.originalData.forEach((item) => {
      const kelompokInfo = item.kelompok || "Tidak ada kelompok";

      if (!appState.groupData[kelompokInfo]) {
        appState.groupData[kelompokInfo] = {
          members: [],
          submittedCount: 0,
        };
      }

      appState.groupData[kelompokInfo].members.push({
        name: item.name,
        status: item.status,
        laporan: item.laporan,
      });

      if (item.status === "Selesai") {
        appState.groupData[kelompokInfo].submittedCount++;
      }
    });

    // Render group summary
    renderGroupSummary();
  }

  function renderGroupSummary() {
    let html = "";

    // Sort groups by key
    const sortedGroups = Object.keys(appState.groupData).sort();

    sortedGroups.forEach((groupKey) => {
      const group = appState.groupData[groupKey];
      const memberCount = group.members.length;
      const submittedCount = group.submittedCount;
      const completionPercentage =
        memberCount > 0
          ? Math.round((submittedCount / memberCount) * 100)
          : 0;

      // Determine card color based on completion percentage
      let colorClass;
      if (completionPercentage >= 100) {
        colorClass = "border-green-500";
      } else if (completionPercentage >= 50) {
        colorClass = "border-yellow-500";
      } else {
        colorClass = "border-red-500";
      }

      html += `
            <div class="border-l-4 ${colorClass} bg-white p-4 rounded shadow">
                <h3 class="font-semibold text-gray-800 mb-2">${groupKey.replace(
                  /\n/g,
                  "<br>"
                )}</h3>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-600">Progress:</span>
                    <span class="text-sm font-medium">${submittedCount}/${memberCount} (${completionPercentage}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${completionPercentage}%"></div>
                </div>
                <div class="mt-3">
                    <h4 class="text-xs font-semibold text-gray-700 mb-1">Anggota:</h4>
                    <ul class="text-xs space-y-1">
                        ${group.members
                          .map(
                            (member) => `
                            <li class="flex items-center">
                                <span class="w-2 h-2 rounded-full ${
                                  member.status === "Selesai"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                } mr-2"></span>
                                ${member.name}
                            </li>
                        `
                          )
                          .join("")}
                    </ul>
                </div>
            </div>
            `;
    });

    if (html === "") {
      html = `<div class="text-center text-gray-500 col-span-3">Belum ada data kelompok tersedia</div>`;
    }

    groupSummary.innerHTML = html;
  }

  // Filter and pagination functions
  function filterData() {
    const searchTerm = searchInput.value.toLowerCase();
    const kelasFilter = filterKelas.value;
    const laporanFilter = filterLaporan.value;

    appState.filteredData = appState.originalData.filter((item) => {
      // Search in all properties of the item
      const searchMatch = Object.values(item).some(
        (value) =>
          value &&
          typeof value === "string" &&
          value.toLowerCase().includes(searchTerm)
      );

      const kelasMatch =
        kelasFilter === "all" || item.kelas === kelasFilter;
      const laporanMatch =
        laporanFilter === "all" || item.laporan === laporanFilter;

      return searchMatch && kelasMatch && laporanMatch;
    });

    // Reset to first page when filtering
    appState.currentPage = 1;

    // Update pagination
    updatePagination();

    // Render table
    renderTable();
  }

  function updatePagination() {
    appState.totalPages = Math.ceil(
      appState.filteredData.length / appState.itemsPerPage
    );

    // Update UI elements
    paginationText.textContent = `Halaman ${appState.currentPage} dari ${
      appState.totalPages || 1
    }`;
    prevPageBtn.disabled = appState.currentPage === 1;
    nextPageBtn.disabled = appState.currentPage >= appState.totalPages;

    totalCountText.textContent = appState.filteredData.length;
    const start = (appState.currentPage - 1) * appState.itemsPerPage;
    const end = Math.min(
      start + appState.itemsPerPage,
      appState.filteredData.length
    );
    currentCountText.textContent = `${start + 1}-${end}`;
  }

  function goToPrevPage() {
    if (appState.currentPage > 1) {
      appState.currentPage--;
      updatePagination();
      renderTable();
    }
  }

  function goToNextPage() {
    if (appState.currentPage < appState.totalPages) {
      appState.currentPage++;
      updatePagination();
      renderTable();
    }
  }

  // Rendering functions
  function renderTable() {
    const start = (appState.currentPage - 1) * appState.itemsPerPage;
    const end = Math.min(
      start + appState.itemsPerPage,
      appState.filteredData.length
    );
    const pageData = appState.filteredData.slice(start, end);

    if (pageData.length === 0) {
      dataTable.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center text-gray-500">
                    Tidak ada data yang ditemukan
                </td>
            </tr>`;
      return;
    }

    let html = "";

    pageData.forEach((item, index) => {
      const rowIndex = start + index + 1;

      html += `
            <tr class="${
              index % 2 === 0 ? "bg-white" : "bg-gray-50"
            } hover:bg-blue-50 transition-colors duration-150">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${rowIndex}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${
                  item.name
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${
                  item.kelas
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${
                  item.laporan
                }</td>
                <td class="px-6 py-4 text-sm text-gray-700">${
                  item.kelompok ? item.kelompok.replace(/\n/g, "<hr>") : ""
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatDateTime(
                  item.startTime
                )}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatDateTime(
                  item.endTime
                )}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === "Selesai"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }">
                        ${item.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                    ${
                      item.laporanPraktikum
                        ? `<a href="${item.laporanPraktikum}" target="_blank" class="hover:underline flex items-center"><i class="fas fa-external-link-alt mr-1"></i> Lihat</a>`
                        : "-"
                    }
                </td>
            </tr>`;
    });

    dataTable.innerHTML = html;
  }

  function updateKelasFilter() {
    // Clear existing options except 'all'
    while (filterKelas.options.length > 1) {
      filterKelas.remove(1);
    }

    // Add new options
    appState.kelasOptions.forEach((kelas) => {
      const option = document.createElement("option");
      option.value = kelas;
      option.textContent = kelas;
      filterKelas.appendChild(option);
    });
  }

  function updateLaporanFilter() {
    // Clear existing options except 'all'
    while (filterLaporan.options.length > 1) {
      filterLaporan.remove(1);
    }

    // Add new options
    appState.laporanOptions.forEach((laporan) => {
      const option = document.createElement("option");
      option.value = laporan;
      option.textContent = laporan;
      filterLaporan.appendChild(option);
    });
  }

  function updateStats() {
    // Total students
    totalStudentsEl.textContent = appState.originalData.length;

    // Submitted count
    const submittedCount = appState.originalData.filter(
      (item) => item.status === "Selesai"
    ).length;
    submittedCountEl.textContent = submittedCount;

    // Group count
    const uniqueGroups = new Set();
    appState.originalData.forEach((item) => {
      if (item.kelompok) {
        uniqueGroups.add(item.kelompok);
      }
    });
    groupCountEl.textContent = uniqueGroups.size;

    // Graded count - assuming all submitted are graded for now
    gradedCountEl.textContent = submittedCount;
  }

  // Utility functions
  function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return "-";

    // Try to parse the datetime string
    try {
      // Check if the format is already readable
      if (dateTimeStr.includes("/") && dateTimeStr.includes(":")) {
        return dateTimeStr;
      }

      // Try to parse as Date object
      const date = new Date(dateTimeStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString("id-ID");
      }

      return dateTimeStr;
    } catch (error) {
      return dateTimeStr;
    }
  }

  // Settings functions
  function initializeSettings() {
    // Load items per page setting
    const savedItemsPerPage = localStorage.getItem("itemsPerPage");
    if (savedItemsPerPage) {
      appState.itemsPerPage = parseInt(savedItemsPerPage);
      itemsPerPageSelect.value = savedItemsPerPage;
    }

    // Load dark mode setting
    const darkMode = localStorage.getItem("darkMode") === "true";
    darkModeToggle.checked = darkMode;
    if (darkMode) {
      document.body.classList.add("dark-mode");
      // Apply dark mode styles
    }

    // Load column visibility settings
    const columnSettings = localStorage.getItem("columnSettings");
    if (columnSettings) {
      const settings = JSON.parse(columnSettings);
      document.querySelectorAll(".column-toggle").forEach((checkbox) => {
        checkbox.checked = settings[checkbox.value] !== false;
      });

      // Apply column visibility
      applyColumnVisibility();
    }
  }

  function saveSettings() {
    // Save items per page
    const newItemsPerPage = parseInt(itemsPerPageSelect.value);
    localStorage.setItem("itemsPerPage", newItemsPerPage);
    appState.itemsPerPage = newItemsPerPage;

    // Save dark mode setting
    const darkMode = darkModeToggle.checked;
    localStorage.setItem("darkMode", darkMode);

    // Save column visibility settings
    const columnSettings = {};
    document.querySelectorAll(".column-toggle").forEach((checkbox) => {
      columnSettings[checkbox.value] = checkbox.checked;
    });
    localStorage.setItem("columnSettings", JSON.stringify(columnSettings));

    // Apply column visibility
    applyColumnVisibility();

    // Update pagination and table
    updatePagination();
    renderTable();

    // Close modal
    closeSettingsModal();
  }

  function applyColumnVisibility() {
    const columnSettings = JSON.parse(
      localStorage.getItem("columnSettings")
    );

    // Apply visibility settings to table headers and rows
    const headers = dataTable.querySelectorAll("th");
    const rows = dataTable.querySelectorAll("tr");

    headers.forEach((header, index) => {
      const columnName = header.textContent.trim().toLowerCase();
      if (columnSettings[columnName] === false) {
        header.style.display = "none";
        rows.forEach((row) => {
          row.cells[index].style.display = "none";
        });
      } else {
        header.style.display = "";
        rows.forEach((row) => {
          row.cells[index].style.display = "";
        });
      }
    });
  }

  function openSettingsModal() {
    settingsModal.classList.remove("hidden");
  }

  function closeSettingsModal() {
    settingsModal.classList.add("hidden");
  }

  // Loading state functions
  function showLoading() {
    loadingOverlay.classList.remove("hidden");
  }

  function hideLoading() {
    loadingOverlay.classList.add("hidden");
  }

  // Data persistence functions
  function loadSavedData() {
    const savedData = localStorage.getItem("dashboardData");
    const lastUpdate = localStorage.getItem("lastUpdate");

    if (savedData) {
      try {
        appState.originalData = JSON.parse(savedData);

        // Extract kelas options
        const kelasSet = new Set();
        appState.originalData.forEach((item) => {
          if (item.kelas) {
            kelasSet.add(item.kelas);
          }
        });

        appState.kelasOptions = Array.from(kelasSet).sort();

        // Extract laporan options
        const laporanSet = new Set();
        appState.originalData.forEach((item) => {
          if (item.laporan) {
            laporanSet.add(item.laporan);
          }
        });

        appState.laporanOptions = Array.from(laporanSet).sort();

        // Update kelas filter options
        updateKelasFilter();

        // Update laporan filter options
        updateLaporanFilter();

        // Process group data
        processGroupData();

        // Update stats
        updateStats();

        // Filter and render data
        filterData();

        // Update last update time
        if (lastUpdate) {
          lastUpdateTime.textContent = lastUpdate;
        }
      } catch (error) {
        console.error("Error loading saved data:", error);
      }
    }
  }

  function refreshData() {
    if (appState.originalData.length > 0) {
      filterData();
      processGroupData();
      updateStats();
    }
  }

  function exportToJsonFile(data) {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan_praktikum_data.json";

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importFromJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function (event) {
        try {
          const jsonData = JSON.parse(event.target.result);
          resolve(jsonData);
        } catch (error) {
          reject(new Error("Format file JSON tidak valid"));
        }
      };

      reader.onerror = function () {
        reject(new Error("Gagal membaca file"));
      };

      reader.readAsText(file);
    });
  }