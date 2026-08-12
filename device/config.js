/**
 * Cấu hình trang giả lập thiết bị.
 */
const DEVICE_CONFIG = {
    /**
     * Chặn CTA của playable (window.open / link) và hiện toast thay vì mở tab mới.
     * - enabled : trạng thái mặc định của nút bật/tắt (người dùng bấm đổi thì ưu tiên lựa chọn đó)
     * - duration: thời gian toast tự tắt, tính bằng mili giây
     * - message : nội dung hiển thị
     */
    ctaToast: {
        enabled: true,
        duration: 1500,
        message: "You have successfully clicked"
    },

    /**
     * Độ phân giải ép cho game vẽ (devicePixelRatio giả).
     * Nên đặt >= mức zoom tối đa (3 tương ứng zoom 300%) để phóng to vẫn nét.
     * Càng cao thì máy phải vẽ càng nặng, hạ xuống 2 nếu thấy game giật.
     */
    renderScale: 3
};
