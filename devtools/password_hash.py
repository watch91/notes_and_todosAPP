#!/usr/bin/env python3
"""
密码加密工具
使用与后端相同的 bcrypt 算法加密用户密码
"""

import bcrypt

def hash_password(password: str) -> str:
    """
    使用 bcrypt 算法加密密码
    salt rounds = 10，与后端 bcryptjs 保持一致
    """
    # 生成盐（rounds=10 与后端一致）
    salt = bcrypt.gensalt(rounds=10)
    # 加密密码
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """验证明文密码是否与密文匹配"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

if __name__ == '__main__':
    print("=" * 50)
    print("密码加密工具 (bcrypt)")
    print("=" * 50)
    
    while True:
        password = input("\n请输入要加密的密码 (输入 q 退出): ").strip()
        
        if password.lower() == 'q':
            print("已退出")
            break
        
        if not password:
            print("密码不能为空")
            continue
        
        hashed = hash_password(password)
        print(f"\n原始密码: {password}")
        print(f"加密结果: {hashed}")
        
        # 验证加密结果
        is_valid = verify_password(password, hashed)
        print(f"验证结果: {'通过' if is_valid else '失败'}")
