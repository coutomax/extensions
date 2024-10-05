// ==UserScript==
// @name         Copiar informações relevantes para a documentação da ONU.
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Captura dados relevantes da ONU para a área de transferência.
// @author       Maxwell Couto
// @match        https://autoisp.gegnet.com.br/contracted_services/*
// @match        https://autoisp.gegnet.com.br/gpon_clients/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gegnet.com.br
// @grant        GM_setClipboard
// ==/UserScript==


(function() {
    'use strict';

    function createButton() {
        const container = document.querySelector(".general-buttons-wrapper .card-body");
        if (container) {
            const button = document.createElement("button");
            button.textContent = 'Copiar Dados da ONU';
            button.className = 'btn btn-primary';
            button.style.backgroundColor = '#16bb0f';
            button.style.borderColor = '#16bb0f';
            button.style.color = 'white';
            button.style.border = '1px solid #16bb0f';
            button.style.transition = 'background-color 0.3s ease';

            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#16ad10'; // mudar
            });

            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = '#25a220';
            });

            button.addEventListener('click', () => {
                const gponData = getGpon();
                const modelo = getModel();
                const additionalData = getAdditional();
                const finalData = dataFormatter(gponData, modelo, additionalData);

                copyToClipboard(finalData);
                button.style.backgroundColor = '#14990e';

                setTimeout(() => {
                    button.style.backgroundColor = '#16bb0f';
                }, 150);

            });
            container.appendChild(button);
        }
    }

    function copyToClipboard (info) {
        const tempInput = document.createElement('textarea');
        tempInput.value = info;
        document.body.appendChild(tempInput);
        tempInput.select();

        try {
            document.execCommand('copy');
            showAlert("Informações copiadas com sucesso.");
        } catch (err) {
            alert('Falha ao copiar dados para a área de transferência.'+err.message);
        }

        document.body.removeChild(tempInput);
    }

    function showAlert(message, alertClass = "alert-success") {
        const alertContainer = document.querySelector(".container > div");

        if (alertContainer) {
            const fadingAlerts = alertContainer.querySelectorAll(".fade-out");
            fadingAlerts.forEach(alert => alert.remove());

            const alertDiv = document.createElement("div");
            alertDiv.className = `fade-in alert ${alertClass} alert-dismissible item-enter-done`;
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" aria-label="Close alert"></button>
            `;

            alertDiv.querySelector(".btn-close").addEventListener("click", () => {
                alertDiv.classList.add("fade-out");
                setTimeout(() => alertDiv.remove(), 150); 
            });

            alertContainer.appendChild(alertDiv);

            setTimeout(() => {
                alertDiv.classList.add("show");
            }, 10);

            setTimeout(() => {
                alertDiv.classList.remove("show");
                alertDiv.classList.add("fade-out");
                setTimeout(() => alertDiv.remove(), 150);
            }, 2000);
        }
   }

    function getGpon() {
        const dados = document.querySelector('.bg-Light.border.card-body');

        let gponData = {
            OLT: 'Não disponível.',
            'PON Link': 'Não disponível.',
            'ONU ID': 'Não disponível.',
            'Service Port': 'Não disponível.',
            'VLAN (do perfil)': 'Não disponível.',
            'Descrição na OLT': 'Não disponível.'
        };

        if (dados) {
            console.log('getting GPON data...');
            const rows = dados.querySelectorAll('table tbody tr');
            rows.forEach((row) => {
                const key = row.querySelector('th') ? row.querySelector('th').innerText.trim() : '';
                const value = row.querySelector('td') ? row.querySelector('td').innerText.trim() : '';
                
                if(key == 'OLT'){
                    gponData.OLT = value;
                } else {
                    gponData[key] = value;
                }
            });
        } else {
            console.log('Error 404 - ONU Info Not Found');
        }
        return gponData;
    }

    function getAdditional() {
        let additionalInfoData = {
            'Atenuação Rx ONU': 'Não disponível',
            'Atenuação Rx OLT': 'Não disponível',
            'Modelo de ONU': 'Não disponível',
            'Alarmes' : {
                link_loss : 'Sem alarmes',
                sem_energia: '',
                falha: ''
            },
            'Firmware da ONU': 'Não disponível',
            'Uptime da ONU': 'Não disponível',
            'Negociação': {
                data: [
                    { }
                ]
            },
            'Atualizado em': 'Não disponível'
        };

        const statusSection = document.querySelector('.w-100.borderless-table.table-stripline.table-nowrap');
        if (statusSection) {
            console.log('getting additional data...');
            const rows = statusSection.querySelectorAll('tbody tr');

            rows.forEach((row) => {
                const key = row.querySelector('th') ? row.querySelector('th').innerText.trim() : '';
                const value = row.querySelector('td') ? row.querySelector('td').innerText.trim() : '';

                if(key == 'OLT'){
                    additionalInfoData.OLT = value;
                } else {
                    if(key === 'Alarmes'){
                        const chips = document.querySelectorAll('.status-small.rounded-pill.status-danger');

                        if (chips.length > 0) {
                            for (var i = 0; i < chips.length; i++) {
                                switch (chips[i].innerText.trim()) {
                                    case 'Sem Sinal':
                                        additionalInfoData['Alarmes'].link_loss = 'Sem sinal';
                                        break;
                                    case 'Sem Energia':
                                        additionalInfoData['Alarmes'].sem_energia = 'Sem energia';
                                        break;
                                    case 'Falha':
                                        additionalInfoData['Alarmes'].falha = 'Falha';
                                        break;
                                }
                            }
                        }
                    } else {
                        additionalInfoData[key] = value;
                    }
                }
            });

            const negotiationTable = document.querySelector('p table'); // pega a tabela inteira de negociações
            if (negotiationTable) {
                console.log("Extraindo tabela de Negociação...");
                const negotiationRows = negotiationTable.querySelectorAll('tr td'); // separa somente os valores da tabela de negociações

                if (negotiationRows.length > 0) {
                    let arr = [];
                    for (var i = 0; i < negotiationRows.length; i ++) {
                        arr.push(negotiationRows[i].innerText.trim() === 'desconhecido' ? 'desc.' : negotiationRows[i].innerText.trim());
                    }                    
                    additionalInfoData['Negociação'].data = objMaker(arr);
                } else {
                    console.log("Error 404 - Negotiation data not found.");
                }
            } else {
                console.log("Error 404 - Negotiation tab not found.");
            }
        }

        return additionalInfoData;
    }

    function getModel () { // deixei aqui separado pq pode ser que eu adicione mais modelos na condição.
        const model = document.querySelectorAll('.w-100.text-end');
        const str = model[0].innerText.trim().slice(0, 3);
        
        /* 
        Lista de Modelos das ONUs:
        FHTT
        DACM
        ZTE
        HWT
        PRKS */

        switch (str) {
            case 'FHT':
                return 'Fiberhome - ' + model[0].innerText.trim();
            case 'DAC':
                return 'Datacom - ' + model[0].innerText.trim();
            case 'HWT':
                return 'ONT - ' + model[0].innerText.trim();
            default:
                return model[0].innerText.trim().length ? model[0].innerText.trim() : 'Não disponível';
        }
    }

    const objMaker = (arr) => {
        const objetos = [];
        
        for (let i = 0; i < arr.length; i += 4) {
            const [Ethernet, Link, Velocidade, Duplex] = arr.slice(i, i + 4);
            
            const obj = {
                Ethernet: parseInt(Ethernet),
                Link,
                Velocidade,
                Duplex
            };
            
            objetos.push(obj);
        }
        
        return objetos;
    
    }

    function dataFormatter (gponData, modelo, additionalData) {
        return `ONU está localizada em ${gponData['Descrição na OLT'] || 'Não disponível.'}\n` +
            `Cliente sobe em OLT: ${(gponData.OLT ? gponData.OLT : 'OLT Indisponível.') 
            + ' - ' + (gponData['PON Link'] ? gponData['PON Link'] : 'PON Link Indisponível.') 
            + ' - ' + ' ONU Id: ' + (gponData['ONU ID'] ? gponData['ONU ID'] : 'ONU Id. Indisponível.') + '.' || 'Não disponível.'}\n` +
            `Modelo da ONU: ${modelo || 'Não disponível.'}\n` +
            `Firmware da ONU: ${additionalData['Firmware da ONU'] || 'Não disponível.'}\n` +
            `Service Port: ${gponData['Service Port'] || 'Não disponível.'}\n`+
            `VLAN (do perfil): ${gponData['VLAN (do perfil)'] || 'Não disponível.'}\n`+
            `Uptime: ${additionalData['Uptime da ONU'] || 'Não disponível.'}\n` +
            `Status da ONU: ${additionalData['Negociação'].Link || 'Não disponível.'}\n`+
            `Atenuação Rx ONU: ${atenuacaoFormatter(additionalData)}\n`+
            `Atenuação Rx OLT: ${additionalData['Atenuação Rx OLT'] || 'Não disponível.'}\n`+
            `Negociação: ${additionalData['Negociação'].Link == 'Down' ? 'Desconectado.' :
                '\n\n'+ criarTabela(additionalData['Negociação'].data) || 'Não disponível.'}\n\n` +
            `Alarmes: ${getAlarms(additionalData)}.`;
    }

    function criarTabela(data) {

        let valuePaddings = ['                  ', '     ', '             ', ''];
        
        const objetos = Array.isArray(data) ? data : [data];
        const headers = Object.keys(objetos[0]);
    
        const colWidths = headers.map(header => {
            return Math.max(header.length, ...objetos.map(obj => String(obj[header]).length)) + 6;
        });
    
        const formatarLinha = (items, isHeader = false) => {
            return items.map((item, index) => {
                const str = String(item);
                let padding
                if (isHeader) {
                    padding = ' '.repeat(colWidths[index] - str.length);
                } else {
                    if (parseInt(str) < 10) {
                        padding = '                  ';
                    } else {
                        switch (str.toLowerCase()) { //ajusta os espaçamentos manualmente devido a fonte do Integrator.
                            case 'up':
                                padding = '           ';
                                break;
                            case 'down':
                                padding = '      ';
                                break;
                            case '10m':
                                padding = '                 ';
                                break;
                            case '100m':
                                padding = '               ';
                                break;
                            case '1000m':
                                padding = '             ';
                                break;
                            case '10':
                                padding = '                     ';
                                break;
                            case '100':
                                padding = '                   ';
                                break;
                            case '1000':
                                padding = '                 ';
                                break;
                            default:
                                padding = '';
                                break;
                        }
                    }                    
                }
                return isHeader ? str + padding : str.toLowerCase() + padding;
            }).join(' ');
        };
    
        let resultado = formatarLinha(headers, true) + '\n'; // Cabeçalhos
        resultado += '-'.repeat(resultado.length) + '\n'; // Separador
    
        objetos.forEach(obj => {
            const values = headers.map(header => obj[header]);
            resultado += formatarLinha(values) + '\n';
        });
    
        return resultado;
    }

    function getAlarms(additionalData) {
        const logs = [additionalData.Alarmes.link_loss, additionalData.Alarmes.sem_energia, additionalData.Alarmes.falha];
        const noEmptyLogs = logs.filter(function (item) {
            return !!item;
          });

        let result;

        if (noEmptyLogs.length > 1){
            result = noEmptyLogs.join(', ').toLowerCase();
            result = result.charAt(0).toUpperCase()+result.slice(1).replace(/,\s*$/, "");
        } else {
            return noEmptyLogs[0];            
        }

        return result;
    }

    function atenuacaoFormatter (additionalData) {
        return `${additionalData['Atenuação Rx ONU'] === 'Sem Sinal' 
        || additionalData['Atenuação Rx ONU'] === 'Sem Energia' 
        || additionalData['Atenuação Rx ONU'] === 'LOS' 
        || additionalData['Atenuação Rx ONU'] === 'Falha' 
        ? 'Não disponível.': additionalData['Atenuação Rx ONU']}`;
    }

    window.addEventListener('load', () => {
        setTimeout(createButton, 50);
    });
})();
