const toast = document.getElementById('toast');
const destinationBtn = document.getElementById('destinationBtn');
function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}
document.getElementById('searchBtn').addEventListener('click',()=>showToast('Visual prototype only — search and booking logic comes next.'));
document.querySelectorAll('[data-dest]').forEach(btn=>btn.addEventListener('click',()=>{destinationBtn.textContent=btn.dataset.dest;showToast(`Destination changed to ${btn.dataset.dest}`)}));
document.querySelectorAll('.room-btn').forEach(btn=>btn.addEventListener('click',()=>showToast('Room details page is intentionally not built yet.')));
document.querySelectorAll('.heart').forEach(btn=>btn.addEventListener('click',()=>{btn.textContent=btn.textContent==='♡'?'♥':'♡';}));
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));btn.classList.add('active');showToast(`${btn.textContent} filter selected — demo UI only.`)}));