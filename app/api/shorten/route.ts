import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, customAlias } = await request.json()
    
    console.log('Received URL:', url)
    console.log('Is valid URL:', isValidUrl(url))
    
    if (!url || !isValidUrl(url)) {
      console.log('Validation failed - URL:', url)
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      )
    }

    let shortCode = customAlias

    if (customAlias) {
      const { data: existingAlias } = await supabase
        .from('urls')
        .select('short_code')
        .eq('short_code', customAlias)
        .single()

      if (existingAlias) {
        return NextResponse.json(
          { error: 'Custom alias already exists' },
          { status: 400 }
        )
      }
    } else {
      let isUnique = false
      while (!isUnique) {
        shortCode = generateShortCode()
        const { data: existingCode } = await supabase
          .from('urls')
          .select('short_code')
          .eq('short_code', shortCode)
          .single()

        if (!existingCode) {
          isUnique = true
        }
      }
    }

    const { data, error } = await supabase
      .from('urls')
      .insert([
        {
          long_url: url,
          short_code: shortCode!,
          custom_alias: customAlias || null,
          click_count: 0
        }
      ])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create short URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      shortUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ssn.lat'}/${shortCode}`,
      shortCode: shortCode!
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


