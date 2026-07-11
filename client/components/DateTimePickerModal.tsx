import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';

interface DateTimePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export function DateTimePickerModal({ visible, value, onConfirm, onCancel }: DateTimePickerModalProps) {
  // 使用 useMemo 来初始化状态，避免 useEffect 中的 setState
  const initialValues = useMemo(() => ({
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate(),
    hour: value.getHours(),
    minute: value.getMinutes(),
  }), [value]);

  const [selectedYear, setSelectedYear] = useState(initialValues.year);
  const [selectedMonth, setSelectedMonth] = useState(initialValues.month);
  const [selectedDay, setSelectedDay] = useState(initialValues.day);
  const [selectedHour, setSelectedHour] = useState(initialValues.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialValues.minute);

  // 当弹窗打开时，重置为传入的值
  const handleOpen = () => {
    setSelectedYear(value.getFullYear());
    setSelectedMonth(value.getMonth() + 1);
    setSelectedDay(value.getDate());
    setSelectedHour(value.getHours());
    setSelectedMinute(value.getMinutes());
  };

  const handleConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth - 1, selectedDay, selectedHour, selectedMinute);
    onConfirm(newDate);
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const padNumber = (num: number) => String(num).padStart(2, '0');

  const renderPickerColumn = (
    items: number[],
    selectedValue: number,
    onSelect: (value: number) => void,
    label: string
  ) => {
    return (
      <View className="flex-1 mx-1">
        <Text className="text-xs text-muted text-center mb-2">{label}</Text>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 60 }}
        >
          {items.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => onSelect(item)}
              className={`py-3 items-center rounded-xl ${
                selectedValue === item ? 'bg-accent' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-base ${
                  selectedValue === item ? 'text-white font-bold' : 'text-foreground'
                }`}
              >
                {padNumber(item)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onShow={handleOpen}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/50 justify-end"
      >
        <View className="bg-white rounded-t-3xl">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
            <TouchableOpacity onPress={onCancel}>
              <Text className="text-base text-muted">取消</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold text-foreground">选择时间</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text className="text-base text-accent font-bold">确认</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          <View className="flex-row px-3 py-4" style={{ height: 280 }}>
            {renderPickerColumn(years, selectedYear, setSelectedYear, '年')}
            {renderPickerColumn(months, selectedMonth, setSelectedMonth, '月')}
            {renderPickerColumn(days, selectedDay, setSelectedDay, '日')}
          </View>

          {/* Time Picker */}
          <View className="flex-row px-3 pb-4" style={{ height: 240 }}>
            {renderPickerColumn(hours, selectedHour, setSelectedHour, '时')}
            {renderPickerColumn(minutes, selectedMinute, setSelectedMinute, '分')}
            <View className="flex-1" />
            <View className="flex-1" />
          </View>

          {/* Bottom Safe Area */}
          <View style={{ height: Platform.OS === 'ios' ? 34 : 16 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
