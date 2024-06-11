document.addEventListener('DOMContentLoaded', () => {
    const depositButton = document.getElementById('deposit-button');
    const betButton = document.getElementById('bet-button');
    const withdrawButton = document.getElementById('withdraw-button');
    const balanceDisplay = document.getElementById('balance');
    let balance = 0;

    const socket = new WebSocket('ws://localhost:3000');

    socket.addEventListener('open', () => {
        const email = localStorage.getItem('email'); // Assume email is stored in localStorage after login
        if (email) {
            socket.send(JSON.stringify({ email }));
        }
    });

    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.balance !== undefined) {
            balance = data.balance;
            balanceDisplay.textContent = balance;
        }
    });

    depositButton.addEventListener('click', () => {
        const amount = document.getElementById('amount').value;
        if (amount > 0) {
            const email = localStorage.getItem('email');
            if (email) {
                fetch('/initialize-transaction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, amount })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.data && data.data.authorization_url) {
                        window.location.href = data.data.authorization_url;
                    }
                });
            }
        }
    });

    betButton.addEventListener('click', () => {
        const betAmount = document.getElementById('bet-amount').value;
        const betNumber = document.getElementById('bet-number').value;
        if (betAmount > 0 && betNumber >= 1 && betNumber <= 6) {
            // Betting logic here
            alert(`You bet ${betAmount} on number ${betNumber}`);
        }
    });

    withdrawButton.addEventListener('click', () => {
        const withdrawAmount = document.getElementById('withdraw-amount').value;
        if (withdrawAmount > 0 && withdrawAmount <= balance) {
            // Withdrawal logic here
            alert(`You withdrew ${withdrawAmount} USD`);
        } else {
            alert('Invalid withdraw amount');
        }
    });
});