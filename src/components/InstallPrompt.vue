<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// PWA 安装提示:监听 beforeinstallprompt 事件
// 仅 Chrome/Edge 等支持的浏览器会触发;iOS Safari 需手动引导用户使用分享菜单
const STORAGE_KEY = 'pwa-install-dismissed-at'
const DISMISS_COOLDOWN_DAYS = 30 // 用户关闭后 30 天内不再提示

const visible = ref(false)
const isIOS = ref(false)
const isStandalone = ref(false)
let deferredPrompt = null

function shouldShow() {
  // 已经是独立模式(已安装)则不提示
  if (isStandalone.value) return false
  // iOS 无法触发原生安装弹窗,走引导文案
  if (isIOS.value) {
    const last = localStorage.getItem(STORAGE_KEY)
    if (!last) return true
    return Date.now() - Number(last) > DISMISS_COOLDOWN_DAYS * 24 * 3600 * 1000
  }
  // 非 iOS 但没有 deferredPrompt,说明浏览器不支持安装,不弹
  return !!deferredPrompt
}

function checkPlatform() {
  // iOS Safari 检测
  const ua = navigator.userAgent
  isIOS.value = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)
  // 已安装为独立模式
  isStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

function handleBeforeInstallPrompt(e) {
  // 阻止 Chrome 默认自动弹出的安装提示,改用自定义引导
  e.preventDefault()
  deferredPrompt = e
  if (shouldShow()) visible.value = true
}

function handleAppInstalled() {
  // 安装成功后清理
  deferredPrompt = null
  visible.value = false
  localStorage.removeItem(STORAGE_KEY)
}

async function handleInstall() {
  if (!deferredPrompt) {
    visible.value = false
    return
  }
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted' || outcome === 'dismissed') {
    deferredPrompt = null
    visible.value = false
    if (outcome === 'dismissed') {
      // 用户拒绝,记录冷却时间
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
    }
  }
}

function handleDismiss() {
  visible.value = false
  localStorage.setItem(STORAGE_KEY, String(Date.now()))
}

onMounted(() => {
  checkPlatform()
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  // iOS 直接根据冷却时间判断是否显示
  if (isIOS.value && shouldShow()) {
    visible.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>

<template>
  <Transition name="slide-up">
    <div v-if="visible" class="install-banner">
      <div class="banner-icon">📱</div>
      <div class="banner-content">
        <div class="banner-title">安装到主屏幕</div>
        <div class="banner-desc">
          <template v-if="isIOS">
            点击 Safari 底部「分享」<span class="share-icon">􀈂</span> →「添加到主屏幕」
          </template>
          <template v-else>
            离线可用,像 App 一样使用
          </template>
        </div>
      </div>
      <div class="banner-actions">
        <button v-if="!isIOS" class="install-btn" @click="handleInstall">安装</button>
        <button class="close-btn" @click="handleDismiss">稍后</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.install-banner {
  position: fixed;
  bottom: calc(72px + var(--safe-bottom));
  left: var(--spacer-12);
  right: var(--spacer-12);
  max-width: 616px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: var(--spacer-12);
  padding: var(--spacer-12) var(--spacer-16);
  background: var(--color-text);
  color: #fff;
  border-radius: var(--radius-card);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 50;
}
.banner-icon {
  font-size: 28px;
  flex-shrink: 0;
}
.banner-content {
  flex: 1;
  min-width: 0;
}
.banner-title {
  font-size: 14px;
  font-weight: 600;
}
.banner-desc {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
  line-height: 1.4;
}
.share-icon {
  font-family: -apple-system, "SF Pro Text", sans-serif;
}
.banner-actions {
  display: flex;
  gap: var(--spacer-8);
  flex-shrink: 0;
}
.install-btn {
  padding: var(--spacer-8) var(--spacer-12);
  background: var(--color-brand);
  color: #fff;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
}
.close-btn {
  padding: var(--spacer-8) var(--spacer-12);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: var(--radius);
  font-size: 13px;
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
