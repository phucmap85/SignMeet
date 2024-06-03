import xml.etree.ElementTree as ET
import json

dict_map = {
    "òa": "oà",
    "Òa": "Oà",
    "ÒA": "OÀ",
    "óa": "oá",
    "Óa": "Oá",
    "ÓA": "OÁ",
    "ỏa": "oả",
    "Ỏa": "Oả",
    "ỎA": "OẢ",
    "õa": "oã",
    "Õa": "Oã",
    "ÕA": "OÃ",
    "ọa": "oạ",
    "Ọa": "Oạ",
    "ỌA": "OẠ",
    "òe": "oè",
    "Òe": "Oè",
    "ÒE": "OÈ",
    "óe": "oé",
    "Óe": "Oé",
    "ÓE": "OÉ",
    "ỏe": "oẻ",
    "Ỏe": "Oẻ",
    "ỎE": "OẺ",
    "õe": "oẽ",
    "Õe": "Oẽ",
    "ÕE": "OẼ",
    "ọe": "oẹ",
    "Ọe": "Oẹ",
    "ỌE": "OẸ",
    "ùy": "uỳ",
    "Ùy": "Uỳ",
    "ÙY": "UỲ",
    "úy": "uý",
    "Úy": "Uý",
    "ÚY": "UÝ",
    "ủy": "uỷ",
    "Ủy": "Uỷ",
    "ỦY": "UỶ",
    "ũy": "uỹ",
    "Ũy": "Uỹ",
    "ŨY": "UỸ",
    "ụy": "uỵ",
    "Ụy": "Uỵ",
    "ỤY": "UỴ",
}


# Tone normalization
def tone_normalization(text):
    for i, j in dict_map.items():
        text = text.replace(i, j)
    return text


# Replace special Unicode characters
list_of_word = {
    'dau_sac': 'hamfinger2,hampinky,hamextfingerl,hampalml,hamshouldertop,hamreplace,hamfinger2,hampinky,hamextfingeru,hampalmd,hamshouldertop',
    'dau_huyen': 'hamfinger2,hampinky,hamextfingerl,hampalmd,hamshouldertop,hammovedr',
    'dau_hoi': 'hampinch12open,hammiddlefinger,hamfingerbendmod,hamringfinger,hamfingerbendmod,hamextfingeru,hampalml,hamshouldertop,hammoved,hamarcr',
    'dau_nga': 'hamfinger2,hampinky,hamextfingero,hampalml,hamshouldertop,hammover,hamwavy,hamellipsev,hamreplace,hamfinger2,hampinky,hamextfingeru,hampalmd',
    'dau_nang': 'hamfinger2,hampinky,hamextfingero,hampalml,hamshouldertop,hammoveo',
}


# Read HamNoSys dataset
with open('dataset/VSL-HamNoSys.txt', 'r', encoding='utf-8-sig') as hamnosys:
    for line in hamnosys.readlines()[1:]:
        temp = line.replace('\n', '').split('\t')
        list_of_word[tone_normalization(temp[0]).lower()] = temp[-1]


# Read sign_duration dataset
sign_duration = {}
with open('dataset/sign_duration.csv', 'r', encoding='utf-8-sig') as duration:
    for line in duration.readlines()[1:]:
        temp = line.replace('\n', '').split(',')
        sign_duration[tone_normalization(temp[0]).lower()] = round(float(temp[-1]), 2)


mark_map = {
    'á': ['a', 'dau_sac'],
    'à': ['a', 'dau_huyen'],
    'ả': ['a', 'dau_hoi'],
    'ã': ['a', 'dau_nga'],
    'ạ': ['a', 'dau_nang'],

    'ắ': ['ă', 'dau_sac'],
    'ằ': ['ă', 'dau_huyen'],
    'ẳ': ['ă', 'dau_hoi'],
    'ẵ': ['ă', 'dau_nga'],
    'ặ': ['ă', 'dau_nang'],

    'ấ': ['â', 'dau_sac'],
    'ầ': ['â', 'dau_huyen'],
    'ẩ': ['â', 'dau_hoi'],
    'ẫ': ['â', 'dau_nga'],
    'ậ': ['â', 'dau_nang'],

    'é': ['e', 'dau_sac'],
    'è': ['e', 'dau_huyen'],
    'ẻ': ['e', 'dau_hoi'],
    'ẽ': ['e', 'dau_nga'],
    'ẹ': ['e', 'dau_nang'],

    'ế': ['ê', 'dau_sac'],
    'ề': ['ê', 'dau_huyen'],
    'ể': ['ê', 'dau_hoi'],
    'ễ': ['ê', 'dau_nga'],
    'ệ': ['ê', 'dau_nang'],

    'í': ['i', 'dau_sac'],
    'ì': ['i', 'dau_huyen'],
    'ỉ': ['i', 'dau_hoi'],
    'ĩ': ['i', 'dau_nga'],
    'ị': ['i', 'dau_nang'],

    'ó': ['o', 'dau_sac'],
    'ò': ['o', 'dau_huyen'],
    'ỏ': ['o', 'dau_hoi'],
    'õ': ['o', 'dau_nga'],
    'ọ': ['o', 'dau_nang'],

    'ố': ['ô', 'dau_sac'],
    'ồ': ['ô', 'dau_huyen'],
    'ổ': ['ô', 'dau_hoi'],
    'ỗ': ['ô', 'dau_nga'],
    'ộ': ['ô', 'dau_nang'],

    'ớ': ['ơ', 'dau_sac'],
    'ờ': ['ơ', 'dau_huyen'],
    'ở': ['ơ', 'dau_hoi'],
    'ỡ': ['ơ', 'dau_nga'],
    'ợ': ['ơ', 'dau_nang'],

    'ú': ['u', 'dau_sac'],
    'ù': ['u', 'dau_huyen'],
    'ủ': ['u', 'dau_hoi'],
    'ũ': ['u', 'dau_nga'],
    'ụ': ['u', 'dau_nang'],

    'ứ': ['ư', 'dau_sac'],
    'ừ': ['ư', 'dau_huyen'],
    'ử': ['ư', 'dau_hoi'],
    'ữ': ['ư', 'dau_nga'],
    'ự': ['ư', 'dau_nang'],

    'ý': ['y', 'dau_sac'],
    'ỳ': ['y', 'dau_huyen'],
    'ỷ': ['y', 'dau_hoi'],
    'ỹ': ['y', 'dau_nga'],
    'ỵ': ['y', 'dau_nang'],
}


def replace_special_mark(letter):
    if letter in mark_map:
        return mark_map[letter]
    return letter


# Sentence to HamNoSys SiGML
def sentence_to_sigml(sentence):
    main = ET.Element('sigml')
    temp_list = sentence.split()

    sentence_words = []

    for word in temp_list:
        if word in list_of_word and sign_duration[word] >= 0.1:
            sentence_words.append(word)
        else:
            for letter in word.replace('_', ''):
                sentence_words.extend(replace_special_mark(letter))

    for word in sentence_words:
        itemGloss = ET.SubElement(main, 'hns_sign')
        itemGloss.set('gloss', word)
        itemNonManual = ET.SubElement(itemGloss, 'hamnosys_nonmanual')
        itemManual = ET.SubElement(itemGloss, 'hamnosys_manual')

        for letter in list_of_word[word].split(','):
            ET.SubElement(itemManual, letter)

    return ET.tostring(main, encoding='unicode')

print(json.dumps({'sigml': sentence_to_sigml('con_gà')}))
# print(re.escape(text))