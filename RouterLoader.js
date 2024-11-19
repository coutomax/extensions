// ==UserScript==
// @name         RouterLoader.
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Copia o motivo da desconexão e encaminha para o roteador, se estiver conectado.
// @author       Maxwell Couto
// @match        https://integrator6.gegnet.com.br/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gegnet.com.br
// @grant        GM_setClipboard
// ==/UserScript==

(function () {

    let createdButton = false;

    function createButton () {
        const observer = new MutationObserver(() => {
            const container = document.querySelector('div .wrap-form.nav.nav-cab-opcoes.nav-pills.pointer');
            const isMenuOpen = document.querySelector('#codsercli');


            if (isMenuOpen) {
                if (!createdButton) {
                    const itemsList = container.querySelectorAll('div .menu-item');
                    const button = document.createElement('button');

                    button.id = 'btn-opeeen-router';
                    button.textContent = 'Abrir Roteador';
                    button.className = 'btn btn-primary';
                    button.style.backgroundColor = '#16bb0f';
                    button.style.borderColor = '#16bb0f';
                    button.style.color = 'white';
                    button.style.border = '1px solid #16bb0f';
                    button.style.transition = 'background-color 0.3s ease';
                    button.style.marginLeft = '10px';
                    button.style.padding = '6px 6px 6px 6px';

                    button.addEventListener('mouseover', () => {
                        button.style.backgroundColor = '#16bb0f';
                    });

                    button.addEventListener('mouseout', () => {
                        button.style.backgroundColor = '25a220';
                    });

                    button.addEventListener('click', () => {
                        setDate();
                        getDataFromTable(); // pega o IP e o motivo da desconexão.
                    });

                    const lastItem = itemsList[itemsList.length - 1];
                    if (lastItem) {
                        lastItem.appendChild(button);
                    }
                }
                createdButton = true;
            } else {
                createdButton = false;
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function setDate () {
            const dateField = document.querySelector('input.ui-inputtext.ui-widget.ui-state-default');
            const btnAtualiza = document.querySelector('[name="AtualizarFinanceiro"]');
            const dataAtual = new Date();

            dataAtual.setMonth(dataAtual.getMonth() - 4);

            if (dateField) {
                eventTrigger(dateField, `01/0${dataAtual.getMonth()}/${dataAtual.getFullYear()}`, true);

                const observer = new MutationObserver(() => {
                    const monthPicker = document.querySelector('select.ui-datepicker-month.ng-tns-c41-3.ng-star-inserted');
                    const yearPicker = document.querySelector('select.ui-datepicker-year.ng-tns-c41-3.ng-star-inserted');
                    const dayPicker = document.querySelector('a.ui-state-default.ng-tns-c41-3.ng-star-inserted');

                    if (monthPicker && yearPicker) {
                        eventTrigger(monthPicker, dataAtual.getMonth());
                        eventTrigger(yearPicker, dataAtual.getFullYear());
                    }

                    if (dayPicker) {
                        dayPicker.click();
                    }

                    if (btnAtualiza) {
                        btnAtualiza.click();
                    }

                    observer.disconnect();
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                // Verificação caso a data retorne para o valor inicial.
                if (dateField.value != `01/0${dataAtual.getMonth()}/${dataAtual.getFullYear()}`) {
                    eventTrigger(dateField, `01/0${dataAtual.getMonth()}/${dataAtual.getFullYear()}`, true);
                }
            }
    }

    function eventTrigger (documentItem, value, isText = false) {
        const inputEvent = new Event('input', {bubbles: true});
        const changeEvent = new Event('change', {bubbles: true});

        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            charCode: 13,
            keyCode: 13,
            which: 13
        });

        setTimeout(() => {
            documentItem.value = value;

            if (isText) {
                setTimeout(() => {
                    documentItem.focus();
                }, 500);
                documentItem.dispatchEvent(inputEvent);
                documentItem.dispatchEvent(changeEvent);
                documentItem.dispatchEvent(enterEvent);
            } else {
                documentItem.dispatchEvent(changeEvent);
            }
        }, 50);
    }

    function getDataFromTable () {
        let object = {
            data: [
                { }
            ]
        };

        let arr = [];
        let objeto = {
            'Início': '',
            'Termino': '',
            'Status do Plano': '',
            IP: '',
            'Motivo da Desconexão': '',
        };

        const observer = new MutationObserver(() => {
            const fullTable = document.querySelector('table.ui-datatable-virtual-table'); // div.ui-datatable-scrollable-view para os headers

            if (fullTable) {
                const dataTable = fullTable.querySelectorAll('tbody tr td'); // tr.ui-datatable-even.uiwidget-content.ng-star-inserted
                
                if (dataTable[0].innerText.trim() !== 'Nenhum histórico de conexão encontrado.' 
                    && (dataTable.length != arr.length)) {

                    arr = [];
                    for (var i = 0; i < dataTable.length; i++) {
                        arr.push(dataTable[i].innerText.trim());
                    }

                    object.data = objMaker(arr);

                    if (objeto['Status do Plano'] === '') {
                        objeto['Status do Plano'] = object.data[0]['Termino'] === '' ? 'Conectado.' : 'Desconectado.';
                        objeto.IP = object.data[0].IP;
                        objeto['Motivo da Desconexão'] = object.data[0]['Termino'] === '' 
                            ? object.data[1]['Motivo Desconexão'] : object.data[0]['Motivo Desconexão'];
                        objeto['Início'] = object.data[0]['Início'];
                        objeto['Termino'] = object.data[0]['Termino'];

                        observer.disconnect();

                        const formatedData = dataFormatter(objeto);
                        copyToClipboard(formatedData);

                        if (objeto["Status do Plano"] === 'Conectado.') {
                            window.open(`https://${objeto.IP}`, '_blank');
                        }
                    }
                }          
            }
        });

        observer.disconnect();

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return objeto;
    }

    const objMaker = (arr) => {
        const keys = [
            "Início",
            "Termino",
            "Tempo",
            "MAC",
            "Tráfego Download",
            "Tráfego Upload",
            "Traf. Total",
            "IP",
            "IPV6 Framed",
            "IPV6 Delegated",
            "Servidor Roteamento",
            "Motivo Desconexão"
        ];

        const objetos = [];

        for (let i = 0; i < arr.length; i += 12) {
            const obj = {};
            keys.forEach((key, index) => {
                obj[key] = arr[i + index] || '';
            });
            objetos.push(obj);
        }
        return objetos;
    }

    function copyToClipboard (info) {
        const tempInput = document.createElement('textarea');
        tempInput.value = info;
        document.body.appendChild(tempInput);
        tempInput.select();

        try {
            document.execCommand('copy');
            alert('Dados copiados para a área de transferência.');
        } catch (err) {
            alert('Falha ao copiar dados para a área de transferência.'+err.message);
        }

        document.body.removeChild(tempInput);
    }

    function dataFormatter (data) {
        return `Plano: ${data['Termino'] ? 'Desconectado.' : 'Conectado.'}\n` +
            `Início: ${data['Início']}.\n`+
            `Término: ${data['Termino'] ? data['Termino'] + '.' : 'Segue conectado.'}\n`+
            `Motivo da desconexão: ${data['Motivo da Desconexão']}.\n`;
    }

    window.addEventListener('load', () => {
        setTimeout(createButton, 150);
    });
})();