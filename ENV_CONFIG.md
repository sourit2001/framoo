# 环境变量配置说明

本项目需要以下环境变量配置，请在 `.env.local` 文件中设置：

## 必需的环境变量

```bash
# Stability AI API Key (用于抠图/背景移除)
STABILITY_API_KEY=your_stability_api_key_here

# OpenRouter API Key (用于 Gemma 模型生成优化提示词)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# PIAPI API Key (用于实际的图像生成)
PIAPI_API_KEY=your_piapi_api_key_here

# Supabase 配置 (可选，用于用户认证)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## API 使用说明

### 三API架构
1. **Stability AI**: 用于抠图/背景移除处理
2. **OpenRouter (Gemma 模型)**: 用于将用户的简单描述扩展为详细的图像生成提示词
3. **PIAPI**: 用于实际的图像生成，使用 FLUX 模型

### 获取 API Keys

#### Stability AI API Key
1. 访问 [Stability AI](https://platform.stability.ai/)
2. 注册账户并获取 API Key
3. 用于背景移除/抠图功能

#### OpenRouter API Key
1. 访问 [OpenRouter](https://openrouter.ai/)
2. 注册账户并获取 API Key
3. 免费额度可使用 Gemma 模型

#### PIAPI API Key  
1. 访问 [PIAPI](https://piapi.ai/)
2. 注册账户并获取 API Key
3. 用于 FLUX 模型图像生成

## 完整使用流程

### 步骤 1: 抠图处理
1. 用户上传前景图片
2. 调用 Stability AI 进行背景移除
3. 返回抠图结果供预览

### 步骤 2: 背景生成
1. 用户输入背景描述或上传背景图片
2. 如选择AI生成：
   - 系统分析前景图片的光影特征
   - 使用 Gemma 模型生成优化的英文提示词
   - 使用 PIAPI 的 FLUX 模型生成背景图片
3. 返回背景图片URL

### 步骤 3: 参数调整
1. 实时预览融合效果
2. 调整光影参数（方向、强度、柔和度、阴影）
3. 调整色彩转移参数（强度、对比度、高光保护）

### 步骤 4: 完成融合
1. 生成最终融合图片
2. 支持下载结果
