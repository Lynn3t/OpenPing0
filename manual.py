#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Manual IP Annotation System
手动IP标注系统 - 用于生成manual.json文件
"""

import json
import ipaddress
from typing import Dict, List, Any, Optional

class ManualIPAnnotation:
    def __init__(self):
        self.manual_data = {}
        
        # 风险等级选项
        self.risk_levels = {
            '安全': {'color': '#4CAF50', 'min_score': 0, 'max_score': 30},
            '低风险': {'color': '#FFC107', 'min_score': 31, 'max_score': 50},
            '中风险': {'color': '#FF9800', 'min_score': 51, 'max_score': 70},
            '高风险': {'color': '#F44336', 'min_score': 71, 'max_score': 90},
            '极高风险': {'color': '#9C27B0', 'min_score': 91, 'max_score': 100}
        }
        
        # IP类型选项
        self.ip_types = ['家庭宽带IP', 'IDC机房IP']
        
        # 原生IP选项
        self.native_ip_options = ['原生IP', '广播IP']
        
        # 共享人数选项
        self.shared_users_options = [
            '1-10 (极好)',
            '10-100 (一般)',
            '100-1000 (风险)',
            '1000-10000 (高危)',
            '10000+ (极度风险)',
            '检测中...'
        ]

    def ip_to_number(self, ip_str: str) -> int:
        """将IP地址转换为数字"""
        try:
            return int(ipaddress.IPv4Address(ip_str))
        except:
            return 0

    def get_risk_color(self, risk_score: int) -> str:
        """根据风险分数获取颜色"""
        for level, info in self.risk_levels.items():
            if info['min_score'] <= risk_score <= info['max_score']:
                return info['color']
        return '#999999'

    def get_risk_level(self, risk_score: int) -> str:
        """根据风险分数获取风险等级"""
        for level, info in self.risk_levels.items():
            if info['min_score'] <= risk_score <= info['max_score']:
                return level
        return '未知'

    def add_manual_entry(self, ip: str, **kwargs) -> bool:
        """添加手动标注条目"""
        try:
            # 验证IP地址格式
            ipaddress.IPv4Address(ip)
            
            # 默认数据结构
            default_data = {
                'locationInfo': '正在加载...',
                'asnInfo': '正在加载...',
                'asnOwner': '正在加载...',
                'organization': '正在加载...',
                'longitude': '0',
                'latitude': '0',
                'ipType': '检测中...',
                'riskScore': 0,
                'riskLevel': '检测中',
                'riskColor': '#999999',
                'isNativeIP': '检测中...',
                'ipNumber': 0,
                'ipnum': 0,
                'sharedUsers': '1-10 (极好)',
                'rdns': '',
                'countryFlag': ''
            }
            
            # 更新提供的数据
            for key, value in kwargs.items():
                if key in default_data:
                    default_data[key] = value
            
            # 自动计算IP数字形式
            default_data['ipNumber'] = self.ip_to_number(ip)
            default_data['ipnum'] = default_data['ipNumber']
            
            # 如果提供了风险分数，自动设置风险等级和颜色
            if 'riskScore' in kwargs and isinstance(kwargs['riskScore'], int):
                risk_score = kwargs['riskScore']
                default_data['riskLevel'] = self.get_risk_level(risk_score)
                default_data['riskColor'] = self.get_risk_color(risk_score)
            
            self.manual_data[ip] = default_data
            return True
            
        except ValueError:
            print(f"错误：无效的IP地址格式 - {ip}")
            return False

    def remove_entry(self, ip: str) -> bool:
        """删除条目"""
        if ip in self.manual_data:
            del self.manual_data[ip]
            return True
        return False

    def list_entries(self) -> List[str]:
        """列出所有条目"""
        return list(self.manual_data.keys())

    def get_entry(self, ip: str) -> Optional[Dict]:
        """获取指定IP的条目"""
        return self.manual_data.get(ip)

    def save_to_file(self, filename: str = 'manual.json') -> bool:
        """保存到JSON文件"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.manual_data, f, ensure_ascii=False, indent=2)
            print(f"成功保存到 {filename}")
            return True
        except Exception as e:
            print(f"保存失败：{e}")
            return False

    def load_from_file(self, filename: str = 'manual.json') -> bool:
        """从JSON文件加载"""
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                self.manual_data = json.load(f)
            print(f"成功从 {filename} 加载数据")
            return True
        except FileNotFoundError:
            print(f"文件 {filename} 不存在，创建新的标注数据")
            return True
        except Exception as e:
            print(f"加载失败：{e}")
            return False

    def interactive_add(self):
        """交互式添加条目"""
        print("\n=== 添加手动标注 ===")
        
        ip = input("请输入IP地址: ").strip()
        if not ip:
            print("IP地址不能为空")
            return
        
        try:
            ipaddress.IPv4Address(ip)
        except ValueError:
            print("无效的IP地址格式")
            return
        
        print(f"\n为IP {ip} 添加标注信息：")
        
        data = {}
        
        # 位置信息
        location = input("位置信息（如：中国 广东 深圳）: ").strip()
        if location:
            data['locationInfo'] = location
        
        # ASN信息
        asn = input("ASN信息（如：AS4134）: ").strip()
        if asn:
            data['asnInfo'] = asn
        
        # ASN所有者
        asn_owner = input("ASN所有者: ").strip()
        if asn_owner:
            data['asnOwner'] = asn_owner
        
        # 企业信息
        org = input("企业信息: ").strip()
        if org:
            data['organization'] = org
        
        # 经纬度
        longitude = input("经度: ").strip()
        if longitude:
            data['longitude'] = longitude
            
        latitude = input("纬度: ").strip()
        if latitude:
            data['latitude'] = latitude
        
        # IP类型
        print(f"\nIP类型选项：{', '.join(self.ip_types)}")
        ip_type = input("IP类型: ").strip()
        if ip_type in self.ip_types:
            data['ipType'] = ip_type
        
        # 风险分数
        risk_input = input("风险分数（0-100）: ").strip()
        if risk_input.isdigit():
            risk_score = int(risk_input)
            if 0 <= risk_score <= 100:
                data['riskScore'] = risk_score
        
        # 原生IP
        print(f"\n原生IP选项：{', '.join(self.native_ip_options)}")
        native_ip = input("原生IP: ").strip()
        if native_ip in self.native_ip_options:
            data['isNativeIP'] = native_ip
        
        # 共享人数
        print(f"\n共享人数选项：{', '.join(self.shared_users_options)}")
        shared_users = input("共享人数: ").strip()
        if shared_users in self.shared_users_options:
            data['sharedUsers'] = shared_users
        
        # RDNS
        rdns = input("反向DNS: ").strip()
        if rdns:
            data['rdns'] = rdns
        
        # 国家标志
        country_flag = input("国家标志（如：CN）: ").strip()
        if country_flag:
            data['countryFlag'] = country_flag
        
        # 添加条目
        if self.add_manual_entry(ip, **data):
            print(f"✅ 成功添加IP {ip} 的标注信息")
        else:
            print("❌ 添加失败")

    def interactive_menu(self):
        """交互式菜单"""
        while True:
            print("\n" + "="*50)
            print("手动IP标注系统")
            print("="*50)
            print("1. 添加标注")
            print("2. 查看所有标注")
            print("3. 查看指定IP标注")
            print("4. 删除标注")
            print("5. 保存到文件")
            print("6. 从文件加载")
            print("7. 退出")
            print("="*50)
            
            choice = input("请选择操作（1-7）: ").strip()
            
            if choice == '1':
                self.interactive_add()
            
            elif choice == '2':
                entries = self.list_entries()
                if entries:
                    print(f"\n共有 {len(entries)} 个标注:")
                    for i, ip in enumerate(entries, 1):
                        entry = self.get_entry(ip)
                        print(f"{i}. {ip} - {entry.get('locationInfo', 'N/A')}")
                else:
                    print("\n暂无标注数据")
            
            elif choice == '3':
                ip = input("请输入要查看的IP: ").strip()
                entry = self.get_entry(ip)
                if entry:
                    print(f"\n{ip} 的标注信息:")
                    for key, value in entry.items():
                        print(f"  {key}: {value}")
                else:
                    print(f"\n未找到 {ip} 的标注信息")
            
            elif choice == '4':
                ip = input("请输入要删除的IP: ").strip()
                if self.remove_entry(ip):
                    print(f"✅ 已删除 {ip} 的标注")
                else:
                    print(f"❌ 未找到 {ip} 的标注")
            
            elif choice == '5':
                filename = input("保存文件名（默认manual.json）: ").strip()
                if not filename:
                    filename = 'manual.json'
                self.save_to_file(filename)
            
            elif choice == '6':
                filename = input("加载文件名（默认manual.json）: ").strip()
                if not filename:
                    filename = 'manual.json'
                self.load_from_file(filename)
            
            elif choice == '7':
                print("退出程序")
                break
            
            else:
                print("无效选择，请重新输入")

def main():
    """主函数"""
    annotation = ManualIPAnnotation()
    
    # 尝试加载现有数据
    annotation.load_from_file()
    
    # 启动交互式菜单
    annotation.interactive_menu()

if __name__ == "__main__":
    main()