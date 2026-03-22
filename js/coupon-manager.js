/**
 * Coupon Management System
 * Features: LocalStorage persistent storage, Monthly reset, JSON-based coupon list
 */

class CouponManager {
    constructor() {
        this.couponsKey = 'saitama-earned-coupons';
        this.resetDateKey = 'saitama-coupon-reset-date';
        // Determine the correct path to the JSON file based on current page depth
        const pathPrefix = window.location.pathname.includes('/destinations/') ? '../' : '';
        this.dataUrl = pathPrefix + 'js/coupons-data.json';
        this.couponsData = [];
        this.init();
    }

    async init() {
        await this.loadCouponsData();
        this.checkMonthlyReset();
        this.updateHeaderBadge();
    }

    async loadCouponsData() {
        try {
            const res = await fetch(this.dataUrl);
            this.couponsData = await res.json();
        } catch (e) {
            console.error('Coupon data load error:', e);
            // Fallback hardcoded if JSON fails
            this.couponsData = [
                { id: "SAITAMA2026KEBR", title: "共通クーポン", description: "全公園売店 10% OFF", source: "システム" }
            ];
        }
    }

    checkMonthlyReset() {
        const lastReset = localStorage.getItem(this.resetDateKey);
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;

        if (lastReset !== currentMonth) {
            console.log('New month detected. Resetting coupons usage tracking...');
            // In a real app, we might just reset 'used' status, but for this simple version
            // we'll clear everything to simulate fresh monthly deals
            localStorage.removeItem(this.couponsKey);
            localStorage.setItem(this.resetDateKey, currentMonth);
        }
    }

    getEarnedCoupons() {
        const earnedIds = JSON.parse(localStorage.getItem(this.couponsKey) || '[]');
        return this.couponsData.filter(c => earnedIds.includes(c.id));
    }

    unlockCoupon(couponId) {
        let earnedIds = JSON.parse(localStorage.getItem(this.couponsKey) || '[]');
        if (!earnedIds.includes(couponId)) {
            earnedIds.push(couponId);
            localStorage.setItem(this.couponsKey, JSON.stringify(earnedIds));
            this.updateHeaderBadge();
            this.showUnlockNotification(couponId);
        }
    }

    updateHeaderBadge() {
        const coupons = this.getEarnedCoupons();
        const badge = document.getElementById('coupon-menu-item');
        if (badge) {
            if (coupons.length > 0) {
                badge.classList.remove('hidden');
                badge.innerHTML = `💎 特典 (${coupons.length})`;
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    showUnlockNotification(couponId) {
        const coupon = this.couponsData.find(c => c.id === couponId);
        if (!coupon) return;

        const notify = document.createElement('div');
        notify.className = "fixed top-20 right-4 bg-yellow-400 text-black p-4 rounded-xl shadow-2xl z-[5000] animate-in slide-in-from-right-full duration-500 max-w-xs";
        notify.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-3xl">🎁</span>
                <div>
                    <div class="font-bold text-sm">クーポン獲得！</div>
                    <div class="text-xs font-bold">${coupon.title}</div>
                </div>
            </div>
            <button onclick="location.href='coupons.html'" class="mt-3 w-full bg-black text-white py-1 px-3 rounded text-xs font-bold">確認する</button>
        `;
        document.body.appendChild(notify);
        setTimeout(() => notify.remove(), 8000);
    }
}

// Global instance
window.couponManager = new CouponManager();
